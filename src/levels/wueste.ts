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
...S...t....t.K...GGGGGDDDDGGG...t......ct.........K...t......t.YYYYYYYYY...t..........ct....GGGGGDDDGGG...t............ts....K.....t............t....Z...t
GGGGGGGGGGGGGGGGGGDDDDDDDDDDDDGGGGGG~GGGGGGGG~~GGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGG~~~GGGGGGGGGGDDDDDDDDDDDGGGGGGG~~GG~~GGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGG
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDD~~~DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..DDDDDDDDDDDDDDDDDD
`);
