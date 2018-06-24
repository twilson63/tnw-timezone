import minify from 'rollup-plugin-babel-minify'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const outFolder = 'dist'

export default [
  {
    input: 'index.js',
    output: {
      file: `${outFolder}/tnw-timezone.bundled.js`,
      format: 'iife',
      name: 'TnwTimezone'
    },
    plugins: [resolve(), commonjs()]
  },
  {
    input: 'index.js',
    output: {
      file: `${outFolder}/tnw-timezone.bundled.min.js`,
      format: 'iife',
      name: 'TnwTimezone'
    },
    plugins: [resolve(), commonjs(), minify({ comments: false })]
  }
]
