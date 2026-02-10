let counter = 0;

function v4() {
  return `uuid-${++counter}`;
}

module.exports = {
  v4,
};
