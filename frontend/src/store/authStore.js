// 简易状态管理
class Store {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updater) {
    const newState = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// Token存储
global.token = null;
global.userInfo = null;

const authStore = new Store({
  isLoggedIn: !!global.token,
  user: global.userInfo || null,
  token: global.token,
});

module.exports = { authStore };
