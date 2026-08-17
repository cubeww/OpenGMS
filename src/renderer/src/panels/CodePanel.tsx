import { useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { CodeEditor } from '../CodeEditor'
import { useSave } from '../save'

const sample = `/// @description Move the player
var move_x = keyboard_check(vk_right) - keyboard_check(vk_left);
var move_y = keyboard_check(vk_down) - keyboard_check(vk_up);

x += move_x * move_speed;
y += move_y * move_speed;

if (move_x != 0 || move_y != 0) {
    image_speed = 0.2;
} else {
    image_speed = 0;
    image_index = 0;
}
`

export function CodePanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const [value, setValue] = useState(sample)
  const [saved, setSaved] = useState(sample)
  useSave(api.id, value !== saved, () => setSaved(value))

  return (
    <div className="code-panel">
      <CodeEditor
        id="demo/scrExample"
        value={value}
        eol="lf"
        onChange={setValue}
      />
    </div>
  )
}
