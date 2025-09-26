import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSDK } from '@metamask/sdk-react-native';

const MetaMaskLogin: React.FC = () => {
  const { sdk, connected, connecting, account, chainId } = useSDK();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [nodeActive, setNodeActive] = useState(false);
  const nodeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      await sdk?.connect();
    } catch (error) {
      console.error('连接失败:', error);
      Alert.alert('连接失败', '无法连接到 MetaMask');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setIsLoading(true);
      await sdk?.terminate();
      setBalance('');
      stopNodeHeartbeat();
      Alert.alert('成功', '已断开 MetaMask 连接');
    } catch (error) {
      console.error('断开连接失败:', error);
      Alert.alert('错误', '断开连接失败');
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async () => {
    try {
      setIsLoading(true);
      
      // 使用 wallet_requestPermissions 来触发账户切换界面
      await sdk?.connectWith({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // 获取新的账户信息
      const accounts = await sdk?.connectWith({
        method: 'eth_accounts',
        params: [],
      });
      
      if (accounts && accounts.length > 0) {
        // 更新余额信息
        await getBalance();
        Alert.alert('成功', '账户切换成功');
      }
    } catch (error: any) {
      console.error('切换账户失败:', error);
      // 如果用户取消了操作，不显示错误信息
      if (error.code !== 4001) {
        Alert.alert('错误', '切换账户失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNode = async () => {
    try {
      setIsLoading(true);
      
      // 收集安卓设备信息
      const deviceInfo = await getDeviceInfo();
      
      // 发送到 /api/nodes/link 接口
      const response = await fetch('http://localhost:8888/api/nodes/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: account,
          deviceInfo: deviceInfo,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // 保存节点状态到 AsyncStorage
        await AsyncStorage.setItem('nodeActive', 'true');
        setNodeActive(true);
        startNodeHeartbeat();
        Alert.alert('成功', '节点启动成功！');
        console.log('节点启动响应:', result);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error: any) {
      console.error('启动节点失败:', error);
      Alert.alert('错误', '启动节点失败: ' + error.message);
    } finally {
      if (!nodeActive) {
        setIsLoading(false);
      }
    }
  };

  const getDeviceInfo = async () => {
    const { Platform, Dimensions } = require('react-native');
    const DeviceInfo = require('react-native-device-info');
    
    try {
      const screenData = Dimensions.get('screen');
      
      return {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        deviceModel: await DeviceInfo.getModel(),
        deviceBrand: await DeviceInfo.getBrand(),
        systemName: await DeviceInfo.getSystemName(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        buildNumber: await DeviceInfo.getBuildNumber(),
        bundleId: await DeviceInfo.getBundleId(),
        deviceId: await DeviceInfo.getDeviceId(),
        uniqueId: await DeviceInfo.getUniqueId(),
        screenResolution: `${screenData.width}x${screenData.height}`,
        screenScale: screenData.scale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: await DeviceInfo.getDeviceLocale(),
        country: await DeviceInfo.getDeviceCountry(),
        carrier: await DeviceInfo.getCarrier(),
        totalMemory: await DeviceInfo.getTotalMemory(),
        usedMemory: await DeviceInfo.getUsedMemory(),
        totalDiskCapacity: await DeviceInfo.getTotalDiskCapacity(),
        freeDiskStorage: await DeviceInfo.getFreeDiskStorage(),
        batteryLevel: await DeviceInfo.getBatteryLevel(),
        isEmulator: await DeviceInfo.isEmulator(),
        hasNotch: await DeviceInfo.hasNotch(),
        hasDynamicIsland: await DeviceInfo.hasDynamicIsland(),
      };
    } catch (error) {
      console.warn('获取设备信息失败，使用基础信息:', error);
      // 如果 react-native-device-info 不可用，返回基础信息
      const screenData = Dimensions.get('screen');
      return {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        screenResolution: `${screenData.width}x${screenData.height}`,
        screenScale: screenData.scale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: 'React Native App',
      };
    }
  };

  const getBalance = async () => {
    if (!account || !sdk) return;
    
    try {
      const balanceResult = await sdk.connectWith({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      });
      setBalance(balanceResult);
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  };

  // 检查节点状态
  const checkNodeStatus = async () => {
    try {
      const nodeStatus = await AsyncStorage.getItem('nodeActive');
      if (nodeStatus === 'true') {
        setNodeActive(true);
        startNodeHeartbeat();
      }
    } catch (error) {
      console.error('检查节点状态失败:', error);
    }
  };

  // 开始节点心跳
  const startNodeHeartbeat = async () => {
    if (nodeIntervalRef.current) {
      clearInterval(nodeIntervalRef.current);
    }

    nodeIntervalRef.current = setInterval(async () => {
      try {
        const deviceInfo = await getDeviceInfo();
        await fetch('http://localhost:8888/api/nodes/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: account,
            deviceInfo: deviceInfo,
            timestamp: Date.now()
          })
        });
        console.log('节点心跳发送成功');
      } catch (error) {
        console.error('节点心跳发送失败:', error);
      }
    }, 5000);
  };

  // 停止节点心跳
  const stopNodeHeartbeat = async () => {
    if (nodeIntervalRef.current) {
      clearInterval(nodeIntervalRef.current);
      nodeIntervalRef.current = null;
    }
    setNodeActive(false);
    try {
      await AsyncStorage.removeItem('nodeActive');
    } catch (error) {
      console.error('清除节点状态失败:', error);
    }
  };

  useEffect(() => {
    if (connected && account) {
      getBalance();
      checkNodeStatus();
    }
  }, [connected, account]);

  useEffect(() => {
    return () => {
      // 组件卸载时清理定时器
      if (nodeIntervalRef.current) {
        clearInterval(nodeIntervalRef.current);
      }
    };
  }, []);

  const getNetworkName = (chainId: string) => {
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum 主网',
      '0x3': 'Ropsten 测试网',
      '0x4': 'Rinkeby 测试网',
      '0x5': 'Goerli 测试网',
      '0x89': 'Polygon 主网',
      '0x13881': 'Polygon Mumbai 测试网',
    };
    return networks[chainId] || `未知网络 (${chainId})`;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    if (!balance) return '0.0000';
    const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
    return ethBalance.toFixed(4);
  };

  // 下拉刷新功能
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (connected && account) {
        await getBalance();
        Alert.alert('成功', '刷新完成');
      }
    } catch (error) {
      console.error('刷新失败:', error);
      Alert.alert('错误', '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  if (connecting || isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5576c" />
          <Text style={styles.loadingText}>
            {connecting ? '连接中...' : '处理中...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f5576c']}
            tintColor="#f5576c"
            title="下拉刷新"
            titleColor="rgba(255, 255, 255, 0.8)"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image 
              source={require('../../assets/images/janction.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>Janction 节点网络</Text>
        </View>

      {!connected ? (
        <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
          <Text style={styles.connectButtonText}>连接 MetaMask 钱包</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.walletInfo}>
          <Text style={styles.walletTitle}>钱包信息</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>地址:</Text>
            <Text style={styles.infoValue}>{formatAddress(account || '')}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>网络:</Text>
            <Text style={styles.infoValue}>{getNetworkName(chainId || '')}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>余额:</Text>
            <Text style={styles.balanceValue}>{formatBalance(balance)} ETH</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.startNodeButton]} 
              onPress={nodeActive ? stopNodeHeartbeat : startNode}
            >
              <Text style={styles.actionButtonText}>
                {nodeActive ? '停止节点' : '启动节点'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.switchButton]} 
              onPress={switchAccount}
            >
              <Text style={styles.actionButtonText}>切换账户</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.disconnectButton]} 
              onPress={disconnectWallet}
            >
              <Text style={styles.actionButtonText}>断开连接</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>安全的 MetaMask 连接</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>实时余额显示</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>多链网络支持</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>账户管理功能</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    marginHorizontal: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  connectButton: {
    backgroundColor: '#f5576c',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  walletInfo: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  balanceValue: {
    fontSize: 16,
    color: '#f5576c',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 0.31,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  startNodeButton: {
    backgroundColor: '#4CAF50',
  },
  switchButton: {
    backgroundColor: '#667eea',
  },
  disconnectButton: {
    backgroundColor: '#ff6b6b',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  features: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#f5576c',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  featureIconText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
});

export default MetaMaskLogin;