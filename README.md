# Rock'n Ride Cars

A browser-based open-world driving game built with Three.js. Drive 6 real cars (BMW M5, M4, Challenger, G-Class, Lamborghini Aventador, Koenigsegg Jesko) through a procedurally generated city with an elevated ring highway, stunt ramps, day/night cycle, and a coin-based take-over mechanic.

## Play

The game uses ES modules, so it must be served over HTTP (not opened as a file).

```bash
# Python
python -m http.server 8000

# Node
npx serve

# Or use VS Code Live Server extension
```

Then open <http://localhost:8000>.

## Controls

| Key | Action |
|---|---|
| **W** | Throttle |
| **S** | Brake / Reverse |
| **A** | Steer left |
| **D** | Steer right |
| **Shift** | Nitro boost |
| **C** | Cycle camera (chase / cockpit / overhead) |
| **Esc** | Pause |

Bump into any car on the road to **take it over** — costs coins depending on the car's class.

## Tech

- [Three.js r185](https://threejs.org/) via ESM import map
- No build step, no bundler, no framework
- 100% procedural geometry and canvas textures

## License

MIT — see [LICENSE](LICENSE).


A.vihas
Akshaj 
Thanany 
Nandan
Jesvik


