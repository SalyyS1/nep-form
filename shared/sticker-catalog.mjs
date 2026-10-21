import { STICKER_PATHS } from './sticker-paths.mjs';
const groups = {
  minimal: [['circle','Hình tròn'],['arch','Khung vòm'],['grid','Ô lưới'],['orbit','Quỹ đạo'],['diamond','Kim cương'],['sparkle','Ánh sao'],['line-leaf','Lá nét mảnh'],['abstract-face','Gương mặt nét']],
  street: [['bolt','Tia chớp'],['flame','Ngọn lửa'],['crown','Vương miện'],['gothic-cross','Dấu cộng gothic'],['checker','Cờ caro'],['headphones','Tai nghe'],['eye','Con mắt'],['spray-star','Sao graffiti']],
  retro: [['smile','Mặt cười'],['sunburst','Mặt trời retro'],['vinyl','Đĩa than'],['peace','Hòa bình'],['disco-ball','Quả cầu disco'],['retro-flower','Hoa thập niên 70'],['rainbow','Cầu vồng'],['wavy-badge','Huy hiệu lượn']],
  cute: [['heart','Trái tim'],['cat','Mèo nhỏ'],['bear','Gấu bông'],['bunny','Thỏ tai dài'],['cherry','Đôi cherry'],['cloud','Mây vui vẻ'],['planet','Hành tinh nhỏ'],['coffee','Cà phê yêu']],
  nature: [['flower','Bông hoa'],['daisy','Cúc họa mi'],['tulip','Hoa tulip'],['monstera','Lá trầu bà'],['mushroom','Nấm nhỏ'],['butterfly','Bươm bướm'],['bee','Ong mật'],['sunflower','Hướng dương']],
  travel: [['star','Ngôi sao'],['mountain','Đỉnh núi'],['camp','Lều cắm trại'],['pine','Cây thông'],['sun-wave','Nắng và sóng'],['compass','La bàn'],['moon','Trăng khuyết'],['postcard','Bưu thiếp']],
};
export const STICKERS = Object.entries(groups).flatMap(([style, entries]) => entries.map(([id, name]) => ({ id, name, style, tags: `${style} ${name}`, path: STICKER_PATHS[id] })));
const legacy = ['star', 'heart', 'flower', 'bolt', 'smile', 'circle'];
STICKERS.sort((a, b) => (legacy.includes(a.id) ? legacy.indexOf(a.id) : 6) - (legacy.includes(b.id) ? legacy.indexOf(b.id) : 6));
