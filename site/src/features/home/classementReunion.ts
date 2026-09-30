export const RELEVE_CLASSEMENT = { date: '01/10/2026', quoi: 'arbres généalogiques en ligne, classement de La Réunion' } as const;
export const CLASSEMENT_REUNION: readonly (readonly [
    string,
    number
])[] = [
    ['PAYET', 229261], ['HOARAU', 169316], ['FONTAINE', 134812], ['ROBERT', 106333], ['GRONDIN', 105417],
    ['BOYER', 104996], ['HOAREAU', 75754], ['MAILLOT', 71411], ['LAURET', 66795], ['CADET', 55927],
    ['LEBON', 54127], ['NATIVEL', 47910], ['DAMOUR', 44489], ['DIJOUX', 44203], ['RIVIERE', 43750],
    ['CLAIN', 40215], ['MUSSARD', 36929], ['TECHER', 35578], ['DALLEAU', 34833], ['PICARD', 34482],
    ['MOREL', 28165], ['TURPIN', 26719], ['BELLON', 25826], ['VITRY', 23985], ['GUICHARD', 23675],
    ['DENNEMONT', 21881], ['RICQUEBOURG', 20469], ['LEBRETON', 20097], ['ROYER', 19741], ['LALLEMAND', 19671],
    ['VIDOT', 18067], ['GONTHIER', 17202], ['PITOU', 16882], ['SAUTRON', 15644], ['BENARD', 15329],
    ['LEPERLIER', 15315], ['LEGROS', 15132], ['HUET', 14932], ['BAILLIF', 14901], ['BEGUE', 14648],
    ['MARTIN', 14388], ['FOLIO', 14386], ['CARON', 14267], ['TOUCHARD', 14250], ['HIBON', 13862],
    ['LEBEAU', 13324], ['GRIMAUD', 12232], ['BARET', 11754], ['VIENNE', 11719], ['MOLLET', 11642],
    ['GONNEAU', 11508], ['GROSSET', 11257], ['DUGAIN', 11120], ['ESPARON', 11120], ['ETHEVE', 10787],
    ['LEPINAY', 10640], ['BOUCHER', 10439], ['LAUTRET', 9930], ['NAZE', 9706], ['MAUNIER', 9540],
    ['SMITH', 8869], ['CHEVALIER', 8091], ['GENCE', 8071], ['SERY', 8051], ['TESSIER', 7780],
    ['MONDON', 7626], ['GRUCHET', 7466], ['MALET', 7184], ['TARBY', 7180], ['MERLO', 6841],
    ['POTHIN', 6702], ['WILMAN', 6644], ['FERRERE', 6588], ['MERCIER', 6056], ['BACHELIER', 6022],
    ['DUBARD', 5979], ['POTIN', 5848], ['DEJEAN', 5603], ['MOREAU', 5591], ['DEVAUX', 5553],
    ['LEICHNIG', 5391], ['LEVENEUR', 5375], ['BIGOT', 5303], ['DANGO', 5212], ['ESCLAVE', 5139],
    ['CERVEAU', 5135], ['CROSNIER', 5055], ['NOEL', 4999], ['COLLET', 4983], ['HUBERT', 4900],
    ['SAVIGNY', 4829], ['RAUX', 4808], ['PERRAULT', 4766], ['ZITTE', 4756], ['TAOCHY', 4694],
    ['GAUVIN', 4684], ['PADRE', 4603], ['PANON', 4582], ['GIGAN', 4534],
];
const plat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
export function classementDe(nom: string): {
    rang: number;
    nombre: number;
} | null {
    const n = plat(nom);
    const i = CLASSEMENT_REUNION.findIndex(([x]) => x === n);
    return i < 0 ? null : { rang: i + 1, nombre: CLASSEMENT_REUNION[i][1] };
}
