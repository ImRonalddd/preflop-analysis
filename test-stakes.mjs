// Test the stake formatting logic
function detectStakeLevel(sb, bb) {
  if (Number.isInteger(sb) && Number.isInteger(bb)) {
    return `${sb}/${bb}`;
  }
  const fmt = (n) => n.toFixed(2);
  return `${fmt(sb)}/${fmt(bb)}`;
}

console.log('SB=0.25, BB=0.50 ->', detectStakeLevel(0.25, 0.50));
console.log('SB=0.50, BB=1.00 ->', detectStakeLevel(0.50, 1.00));
console.log('SB=1.00, BB=2.00 ->', detectStakeLevel(1.00, 2.00));
console.log('SB=2.00, BB=5.00 ->', detectStakeLevel(2.00, 5.00));
console.log('SB=5.00, BB=10.00 ->', detectStakeLevel(5.00, 10.00));
