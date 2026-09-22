import { parseLevel } from './format';

// Level 3: Die Höhle. Dunkel, niedrige Gänge, Lavaseen mit Trittsteinen.
export default parseLevel('Die Höhle', 'cave', `
##################################################################################################################1##############################1###1#1#4########
#######################2##############################################13##1###########################1##3#####################1#1###########11#3#####4#2###4#####
######################1################1###############1#1#############3######2##########.........................................##########
#####################...............######################2######2#..............###3####.........................................#########1
...........##########....................######1#######..........................########
...........##2#######....................####1#########..........................###...##...............................*
.................................................................................###...##
................*..........*.....*...................................*...........................*........tf..t.X..f.........t
.*...........................................................................*...........................GGGGGGGGGGGG3G...GGGGGG
...S..f..t......#.....t.f...........tf.....................X..tf........t..........t.f..................GDDDDDDDDDDDDDD...DDDDDDG....ft...........t...f....Z...t
GGGGGGG3GGGGGGG1G11GGGGGG2G~~1GG~~~GGGGGG........*.......GGGGGGGGGGGG..11G..PPPPGGGGGGGGGGG~~GGG~~~GG~~GDDDDDDDDD2DDDDD...D1DD1DDGGGGG2GGG~~GG11GGGGG3GGGGGGGGGGGG
D1DD2DDDDDDDDDDDDDDDDDD1D1D~~DDD~~~DDDDDD....*..........1DD2DDDDDDDDD..DDD......DDDDDDDDDDD~~DDD~~~D3~~DDDDDDDDDDDDDDDD...DDDDDDDD2DDD1DDD~~DDDDDDDD31DD4DDDDD1DD2
D2DDD1DDDDDDD2D1D2DDDDDDDDD~~DDD~~~DDDDDD...f.t........GDD1DDD2DDDDDD..DDD......DD2DDDDDD1D~~DDD~~~D2~~DDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDD~~DDDD1DDDD11DDDDDDDD3DD
DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDGGG2GGGG~~GGGGDDDDDDDDDDDDDD..DDD......DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
`);
