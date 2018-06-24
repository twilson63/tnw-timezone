# Timezone Web Component

This component displays the current time in the specified
time zone. You can also change the timezone by one of the
buttons. You can get notified when the timezone changes by
listening to the 'on-change' event. It will default on Eastern Time but can be overridden with a prop.

## Install

```
npm install tnw-timezone
```

## Usage

```
import 'tnw-timezone'

...

<tnw-timezone tz="America/New_York" on-change=${handleChange} />
```
