
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
//import cleaner from 'rollup-plugin-cleaner';

const prod = (process.env.NODE_ENV === 'production');
const build_dir = prod ? './build/release' : './build/dev';

export default {
  input: 'build/tmp-js/src/frontend/app.js',
  output: {
    name: 'nnt',
    dir: build_dir,
    format: 'iife'
  },
  onwarn: function (message) {
    // Suppress this error message... there are hundreds of them. Angular team says to ignore it.
    // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
    if (/The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten./.test(message)) {
        return;
    }
  },
  plugins: [
    // cleaner({
    //   targets: [ build_dir ]
    // }),
    nodeResolve(),
    copy({
      targets: [{ src: 'src/static/*', dest: build_dir }]
    }),
    prod && terser()
  ]
};
