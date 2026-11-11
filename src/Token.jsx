class Token {
  constructor(value, position = 0) {
    this.value = value;
    this.position = position;
    this.count = 1;
    this.possible = new Set();
    this.activeTag = null;
  }

  // Increase the count of this token
  increment() {
    this.count += 1;
  }

  isActive() {
    return this.activeTag !== null;
  }

  setActive(tag) {
    this.activeTag = tag;
  }

}

export default Token;
