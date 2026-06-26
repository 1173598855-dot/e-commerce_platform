import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveTokens, clearTokens } from '../api/request';

const USER_KEY = '@user_info';

class AuthStore {
  constructor() {
    this.state = {
      isLoggedIn: false,
      user: null,
      token: null,
    };
    this.listeners = new Set();
    this._hydrated = false;
  }

  getState() { return this.state; }

  setState(updater) {
    const newState = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...newState };
    this._notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // 从本地存储恢复登录态
  async hydrate() {
    if (this._hydrated) return;
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        this.setState({ isLoggedIn: true, user, token: global.token });
      }
    } catch (e) {
      console.warn('[AuthStore] hydrate失败:', e.message);
    }
    this._hydrated = true;
  }

  // 登录成功后调用
  async login(user, token, refresh) {
    global.token = token;
    global.userInfo = user;
    await saveTokens(token, refresh);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    this.setState({ isLoggedIn: true, user, token });
  }

  // 登出
  async logout() {
    global.token = null;
    global.userInfo = null;
    await clearTokens();
    await AsyncStorage.removeItem(USER_KEY);
    this.setState({ isLoggedIn: false, user: null, token: null });
  }

  // 更新用户信息
  async updateUser(updates) {
    const newUser = { ...this.state.user, ...updates };
    global.userInfo = newUser;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    this.setState({ user: newUser });
  }
}

const authStore = new AuthStore();
export { authStore };
