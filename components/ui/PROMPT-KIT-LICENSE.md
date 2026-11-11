# prompt-kit

`chat-container.tsx`, `message.tsx`, `prompt-input.tsx`, and
`scroll-button.tsx` in this folder adapt the corresponding [prompt-kit](https://prompt-kit.com)
registry components, retrieved November 10, 2026 from `https://prompt-kit.com/c/<name>.json`.

The adaptation uses local imports and Base UI buttons, keeps the message layout
primitives with caller-supplied Markdown, guards composition input before sending,
and hides the scroll button from keyboard navigation at the bottom. Unused avatar,
tooltip, action and syntax-highlighting exports are omitted.

## MIT License

Copyright (c) 2025 Julien Thibeaut

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
