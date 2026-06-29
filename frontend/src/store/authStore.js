import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveTokens, clearTokens, loadTokens } from '../api/client';

const USER_KEY = '@user_info';

class AuthStore {
  constructor() {
    this.state = {
      isLoggedIn: false,
      user: null,
      token: null,
      refreshToken: null,
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

  async hydrate() {
    if (this._hydrated) return;
    try {
      const { accessToken, refreshToken } = await loadTokens();
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson && accessToken) {
        const user = JSON.parse(userJson);
        global.userInfo = user;
        this.setState({ isLoggedIn: true, user, token: accessToken, refreshToken });
      }
    } catch (e) {
      console.warn('[AuthStore] hydrate失败:', e.message);
    }
    this._hydrated = true;
  }

  async login(user, token, refresh) {
    global.userInfo = user;
    await saveTokens(token, refresh);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    this.setState({ isLoggedIn: true, user, token, refreshToken: refresh || null });
  }

  async logout() {
    await clearTokens();
    await AsyncStorage.removeItem(USER_KEY);
    this.setState({ isLoggedIn: false, user: null, token: null, refreshToken: null });
  }

  async updateUser(updates) {
    const newUser = { ...this.state.user, ...updates };
    global.userInfo = newUser;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    this.setState({ user: newUser });
  }
}

const authStore = new AuthStore();
export { authStore };
