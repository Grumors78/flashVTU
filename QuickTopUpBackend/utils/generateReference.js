const generateReference = () => {
  return `QTU-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

module.exports = generateReference;
