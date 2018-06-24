import React from 'react'
import { render } from 'react-dom'
import 'tnw-timezone'

render(
  <div>
    <h1>Hello Timezone</h1>
    <tnw-timezone onTick={() => console.log('changed...')} />
  </div>,
  document.getElementById('app')
)
