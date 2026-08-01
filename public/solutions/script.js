export default function print(...args) {
  console.log(...args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a)));
}
