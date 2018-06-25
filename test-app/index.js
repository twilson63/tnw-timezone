import React from 'react'
import { render } from 'react-dom'
import 'tnw-timezone'

class App extends React.Component {
  componentDidMount() {
    this.refs['tz'].addEventListener('change', e => {
      console.log(e.detail)
    })
  }
  render() {
    return (
      <div>
        <h1>Hello Timezone</h1>
        <tnw-timezone tz="Asia/Tokyo" ref="tz" />
      </div>
    )
  }
}

render(<App />, document.getElementById('app'))
