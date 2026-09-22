import { parseLevel } from './format';

// Level 2: Die Wüste. Dünen, Kakteen, eine Tempelruine und die erste Lava.
export default parseLevel('Die Wüste', 'desert', `
.
.
....................................................................*
.................................................................................*.................*
..................................................................Y...Y.......................................................*...........*
..............*.........t...........*.........*...................YYYYY............................t.............*
.*.....................GGGG......................................YYYYYYY..........................GGG.........................K
...S...t....t.K...GGGGGDDDDGGG...t.......t.........K...t......t.YYYYYYYYY...t...........t....GGGGGDDDGGG...t............t.....K.....t............t....Z...t
GGGGGGGGGGGGGGGGGGDDDDDDDDDDDDGGGGGG~GGGGGGGG~~GGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGG~~~GGGGGGGGGGDDDDDDDDDDDGGGGGGG~~GG~~GGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGG
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDD~~~DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
`);
