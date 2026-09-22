import { parseLevel } from './format';

// Level 1: Die Wiese. Leichte Hindernisse, kleine Lücken, am Ende die Ziel-Fahne.
export default parseLevel('Die Wiese', 'meadow', `
.
.
.
...................................*......................................................................*
.................*............................................*......................*..................................*
..........*......................................................................................*
.*....*...................C........t...............##......................C.............................GGG
...S...t..#...t........t..C....GGGGGGGGG.......P..####...t...PPP....t..C...C....t.............t.HH..t.GGGDDDGGG..st.......t..Z...t
GGGGGGGGGGGGGGGGG..GGGGGGGGGGGGDDDDDDDDDGG...GGGGGGGGGGGGGGG.....GGGGGGGGGGGGGGGGGGG..GGG..GGGGGGGGGGGDDDDDDDDDGGGGGGGG..GGGGGGGGGGG
DDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDD.....DDDDDDDDDDDDDDDDDDD..DDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDD
DDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDD.....DDDDDDDDDDDDDDDDDDD..DDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDD
DDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDD.....DDDDDDDDDDDDDDDDDDD..DDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDD
`);
