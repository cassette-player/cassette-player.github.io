# 🎵 Cassette Player Web Component

A mobile-friendly Web Component that recreates the nostalgic experience of an 80s TDK cassette tape player using pure native JavaScript.

![Cassette Player Demo](https://img.shields.io/badge/demo-live-brightgreen)

## ✨ Features

- 🎨 **Authentic 80s Design**: Cassette tape with rounded corners, styled like a classic TDK tape
- ⚙️ **Animated Rotors**: Two white plastic rotors visible behind the transparent window
- 📼 **Realistic Playback**: Left rotor shrinks as tape plays, right rotor grows
- 🖼️ **Custom Label**: Display cover image and song title on the cassette label
- 📱 **Mobile Friendly**: Fully responsive design that works on all devices
- 🎵 **Audio Controls**: Play, pause, and stop buttons
- ✨ **Zero Dependencies**: Pure native JavaScript, no frameworks needed

## 🚀 Quick Start

Simply include the script and use the custom element:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="cassette-player.js"></script>
</head>
<body>
  <cassette-player 
    src="your-audio-file.mp3"
    img="cover-image.jpg"
    title="Your Song Title">
  </cassette-player>
</body>
</html>
```

## 📖 Attributes

| Attribute | Type   | Description                           |
|-----------|--------|---------------------------------------|
| `src`     | String | URL to the MP3 audio file             |
| `img`     | String | URL to the cover image (optional)     |
| `title`   | String | Song or cassette title (optional)     |

## 🎨 How It Works

1. **Shadow DOM**: The component uses Shadow DOM for style encapsulation
2. **Audio API**: Native HTML5 Audio API for playback
3. **Animation**: RequestAnimationFrame for smooth rotor rotation
4. **Responsive**: CSS media queries ensure mobile compatibility

## 🛠️ Development

The component is built with vanilla JavaScript and requires no build process.

```bash
# Clone the repository
git clone https://github.com/cassette-player/cassette-player.github.io.git

# Open index.html in your browser
open index.html
```

## 📝 License

MIT License - feel free to use this component in your projects!

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
