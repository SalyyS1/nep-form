const ink = '#20201e', olive = '#4f5a40', rust = '#9a482e', rose = '#9b475c', blue = '#34596d';
const text = (value, x, y, width, height, font = 'Be Vietnam Pro', fill = ink, rotation = 0, fontWeight = 400) => ({ kind: 'text', text: value, x, y, width, height, fontFamily: font.includes(':') || font === 'Be Vietnam Pro' || font === 'monospace' || font === 'serif' ? font : `builtin:${font}`, fill, rotation, fontWeight });
const shape = (value, x, y, width, height = width, fill = ink, rotation = 0) => ({ kind: 'shape', shape: value, x, y, width, height, fill, rotation });
const template = (id, name, style, background, layers, tags = '') => ({ id, name, style, background, layers, tags });
export const DESIGN_TEMPLATES = [
  template('own', 'Tuyên ngôn riêng', 'minimal', '#eeebe3', [text('LÀ MÌNH.',15,95,270,75,'Be Vietnam Pro',ink,0,700),text('MỘT BẢN DUY NHẤT',40,190,220,25)]),
  template('club', 'Hội mình có chất', 'street', '#e8ecd9', [text('NẾP CLUB',40,45,220,55,'Be Vietnam Pro',ink,0,700),shape('smile',85,125,130,130,olive),text('CỨ LÀ MÌNH.',40,280,220,28,'monospace')]),
  template('bloom', 'Cứ nở thôi', 'nature', '#e9eddf', [text('NỞ THEO',40,25,220,45,'Be Vietnam Pro',ink,0,700),shape('flower',75,90,150,150,'#647746'),text('CÁCH CỦA BẠN',40,265,220,32,'Be Vietnam Pro',ink,0,700)]),
  template('quiet', 'Chậm và nhẹ', 'minimal', '#e7e4dd', [shape('arch',105,28,90,110,olive),text('chậm thôi.',30,160,240,55,'lora',olive),text('MỌI ĐIỀU ĐỀU CÓ NHỊP RIÊNG',20,240,260,19,'montserrat',olive)]),
  template('balance', 'Một chút cân bằng', 'minimal', '#eee9e4', [shape('orbit',83,28,134,134,ink),text('CÂN BẰNG',24,188,252,45,'montserrat'),text('GIỮA NHỮNG NGÀY BẬN RỘN',30,253,240,18),shape('circle',145,299,10,10,olive)]),
  template('small-bloom', 'Nhánh lá nhỏ', 'minimal', '#e8ebe3', [shape('line-leaf',112,42,76,110,olive),text('ít thôi, đủ rồi.',20,191,260,43,'lora',olive),text('LESS, BUT BETTER',55,258,190,18,'spacemono',olive)]),
  template('afterhours', 'Sau giờ tan ca', 'street', '#e8e4ed', [text('SAU GIỜ',10,15,280,68,'anton','#302a42'),shape('headphones',80,104,140,140,'#302a42'),text('LÀ GIỜ CỦA MÌNH',8,266,284,38,'oswald','#302a42'),text('AFTER HOURS / NẾP STUDIO',22,323,256,17,'spacemono','#302a42')]),
  template('no-rules', 'Không theo khuôn', 'street', '#ece5da', [shape('checker',6,14,78,78,rust),text('KHÔNG',85,25,210,65,'bangers'),text('THEO KHUÔN.',10,115,280,65,'bangers',rust,-4),shape('flame',103,205,94,104,ink),text('TỰ DO THEO CÁCH CỦA BẠN',15,330,270,17,'montserrat')]),
  template('originals', 'Bản gốc duy nhất', 'street', '#e3e6df', [text('BẢN GỐC',8,28,284,69,'anton'),shape('spray-star',86,112,130,130,olive,-10),text('KHÔNG CẦN BẢN SAO',15,267,270,31,'oswald'),text('ORIGINAL / TỪ NGÀY ĐẦU TIÊN',15,319,270,16,'spacemono')]),
  template('retro-slow', 'Chậm một nhịp', 'retro', '#f1e2c9', [shape('sunburst',100,14,100,100,rust),text('chậm',20,126,260,62,'lobster',rust),text('một nhịp.',20,192,260,62,'lobster',rust),text('CỨ TẬN HƯỞNG NGÀY HÔM NAY',20,295,260,18,'montserrat',rust)]),
  template('sun-days', 'Những ngày đầy nắng', 'retro', '#eee0b9', [text('NGÀY ĐẦY NẮNG',15,15,270,40,'oswald',rust),shape('sun-wave',57,85,186,160,rust),text('và mình đầy vui.',10,266,280,43,'pacifico',rust),text('SUNNY SIDE OF LIFE',50,330,200,15,'spacemono',rust)]),
  template('vinyl-club', 'Hội nghe đĩa than', 'retro', '#e6d7c2', [text('HỘI NGHE NHẠC',15,20,270,36,'oswald'),shape('vinyl',65,87,170,170,rust),text('mở một bài quen.',15,278,270,38,'lobster',rust),text('GOOD MUSIC / GOOD COMPANY',25,333,250,15,'spacemono')]),
  template('good-vibes', 'Vui theo cách mình', 'retro', '#eee6cc', [shape('retro-flower',112,9,76,76,rust),text('vui thôi,',18,98,264,60,'lobster',rust,-4),text('nghĩ ít lại.',12,169,276,56,'lobster',rust,3),shape('peace',120,252,60,60,rust),text('GOOD THINGS TAKE THEIR TIME',17,332,266,15,'montserrat',rust)]),
  template('cat-day', 'Hôm nay làm mèo', 'cute', '#f3e5e5', [text('hôm nay',20,13,260,44,'patrickhand',rose),shape('cat',76,82,148,148,rose),text('chỉ muốn làm mèo.',10,260,280,39,'patrickhand',rose),text('NGỦ THÊM MỘT CHÚT CŨNG ĐƯỢC',18,324,264,16,'comfortaa',rose)]),
  template('bear-hug', 'Một cái ôm nhé', 'cute', '#eeded5', [text('gửi bạn một',25,17,250,41,'dancingscript',rust),shape('bear',84,88,132,142,rust),text('cái ôm thật to.',12,263,276,46,'dancingscript',rust),shape('heart',15,124,37,37,rust,-15),shape('heart',246,160,35,35,rust,15)]),
  template('cherry-club', 'Hội cherry ngọt', 'cute', '#f2e6df', [text('CHERRY CLUB',15,20,270,37,'comfortaa',rose),shape('cherry',60,87,180,180,rose),text('ngọt một chút thôi.',15,292,270,38,'pacifico',rose)]),
  template('coffee-date', 'Hẹn một ly cà phê', 'cute', '#ece3d6', [text('hẹn một ly',20,18,260,43,'patrickhand',rust),shape('coffee',78,85,144,155,rust),text('cà phê nhé?',20,271,260,49,'patrickhand',rust),text('BẠN KỂ / MÌNH NGHE',45,334,210,15,'comfortaa',rust)]),
  template('wildflower', 'Hoa dại vẫn nở', 'nature', '#e6eadb', [text('HOA DẠI',20,20,260,47,'playfairdisplay',olive),shape('daisy',25,98,110,110,olive,-12),shape('tulip',147,106,116,145,olive,8),text('vẫn nở theo cách riêng.',12,277,276,33,'lora',olive),text('WILD & GENTLE',55,330,190,15,'montserrat',olive)]),
  template('butterfly-days', 'Ngày mình đổi cánh', 'nature', '#e6e4ed', [shape('butterfly',55,30,190,180,'#66516c'),text('cứ lớn lên.',15,239,270,50,'dancingscript','#66516c'),text('THEO CÁCH CỦA RIÊNG MÌNH',20,321,260,17,'montserrat','#66516c')]),
  template('botanical', 'Một góc xanh', 'nature', '#e1e8dc', [text('MỘT GÓC XANH',15,17,270,36,'playfairdisplay',olive),shape('monstera',75,77,150,174,olive),text('giữa ngày nhiều vội.',15,279,270,34,'lora',olive),text('BREATHE / GROW / REPEAT',30,333,240,15,'spacemono',olive)]),
  template('weekend', 'Cuối tuần đi trốn', 'travel', '#e4e6da', [text('ĐI TRỐN',12,15,276,63,'oswald',olive),shape('camp',75,101,150,150,olive),text('một cuối tuần.',12,280,276,42,'lora',olive),text('OFFLINE IS A NICE PLACE',25,336,250,15,'spacemono',olive)]),
  template('sea-you', 'Hẹn nhau ở biển', 'travel', '#dfe9e7', [text('HẸN NHAU',20,15,260,42,'montserrat',blue),shape('sun-wave',61,91,178,150,blue),text('ở một bờ biển.',15,271,270,45,'pacifico',blue),text('SEA YOU SOON',50,334,200,15,'spacemono',blue)]),
  template('mountain-trip', 'Lên núi thôi', 'travel', '#e2e5e0', [shape('compass',126,7,48,48,blue),text('LÊN NÚI THÔI',12,74,276,42,'oswald',blue),shape('mountain',29,141,242,119,blue),text('để thấy mình nhỏ lại.',15,287,270,34,'lora',blue),text('TAKE THE SCENIC ROUTE',35,337,230,14,'montserrat',blue)]),
  template('postcard-days', 'Gửi từ một nơi xa', 'travel', '#ece3d6', [text('GỬI TỪ MỘT NƠI XA',15,12,270,31,'spacemono',rust),shape('postcard',40,79,220,170,rust,-4),text('mong bạn luôn vui.',15,281,270,42,'dancingscript',rust),text('POSTCARDS / LITTLE ADVENTURES',15,338,270,13,'montserrat',rust)]),
];
const featured = ['retro-slow','afterhours','cat-day','wildflower','weekend','quiet','own','club'];
DESIGN_TEMPLATES.sort((a,b) => (featured.includes(a.id) ? featured.indexOf(a.id) : 8) - (featured.includes(b.id) ? featured.indexOf(b.id) : 8));
export function createTemplateLayers(id, makeId = () => crypto.randomUUID()) {
  const found = DESIGN_TEMPLATES.find(value => value.id === id);
  return found ? found.layers.map(layer => ({ opacity: 1, rotation: 0, fill: ink, ...layer, id: makeId() })) : [];
}
export function recolorTemplateLayers(layers, palette) {
  if (!palette.length) return layers.map(layer => ({ ...layer }));
  const colors = [...new Set(layers.map(layer => layer.fill))];
  return layers.map(layer => ({ ...layer, fill: palette[colors.indexOf(layer.fill) % palette.length] }));
}
