import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
// Hàm tạo Marker bằng Emoji (Thay cho cái ghim nhàm chán)
const createEmojiIcon = (emoji) => {
  return L.divIcon({
    className: "custom-emoji-marker",
    // Giao diện của cái ghim: Hình tròn trắng, viền xanh, đổ bóng, chứa Emoji bên trong
    html: `<div style="font-size: 24px; background: white; border: 3px solid #6366f1; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">${emoji}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22], // Điểm neo chính giữa
    popupAnchor: [0, -22], // Popup nổi lên trên
  });
};

export default function MapTab({ expenses }) {
  // Lọc ra NHỮNG GIAO DỊCH CÓ TỌA ĐỘ và sắp xếp theo thời gian (cũ -> mới để vẽ đường đi)
  const mapData = useMemo(() => {
    return expenses
      .filter((exp) => exp.location && exp.location.lat && exp.location.lng)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [expenses]);

  // Nếu chưa có giao dịch nào có tọa độ -> Hiển thị màn hình trống
  if (mapData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-[2rem] border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4 opacity-50">🗺️</div>
        <h3 className="font-bold text-gray-700 text-xl mb-2">
          Chưa có hành trình nào
        </h3>
        <p className="text-gray-500 text-sm max-w-xs">
          Các giao dịch được gắn thẻ địa điểm sẽ xuất hiện trên bản đồ và tạo
          thành một chuyến đi tuyệt đẹp.
        </p>
      </div>
    );
  }

  // Lấy mảng tọa độ để vẽ đường đứt nét
  const pathCoordinates = mapData.map((exp) => [
    exp.location.lat,
    exp.location.lng,
  ]);

  // Lấy tọa độ của giao dịch MỚI NHẤT để làm tâm bản đồ khi vừa mở lên
  const centerPosition = pathCoordinates[pathCoordinates.length - 1];

  return (
    <div className="h-full w-full rounded-[2rem] overflow-hidden shadow-sm border border-gray-200 relative z-0">
      <MapContainer
        center={centerPosition}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false} // Tắt nút zoom mặc định cho đẹp
      >
        {/* Bản đồ nền của CARTO (Đẹp hơn, mượt hơn và không chặn môi trường test) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Vẽ nét đứt nối các điểm */}
        <Polyline
          positions={pathCoordinates}
          pathOptions={{
            color: "#6366f1", // Màu xanh Indigo của Tailwind
            weight: 4,
            dashArray: "10, 10", // Nét đứt (10px gạch, 10px cách)
            lineJoin: "round",
          }}
        />

        {/* Rải các Emoji lên bản đồ */}
        {mapData.map((exp, index) => (
          <Marker
            key={exp.id}
            position={[exp.location.lat, exp.location.lng]}
            icon={createEmojiIcon(exp.location.emoji || "📍")}
          >
            <Popup className="rounded-xl">
              <div className="text-center p-1">
                <p className="font-bold text-gray-800 text-sm">
                  {exp.location.name}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  {format(new Date(exp.date), "dd/MM/yyyy HH:mm")}
                </p>
                <p className="font-bold text-indigo-600">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(exp.amount)}
                </p>
                <div className="text-[10px] text-gray-400 mt-1">
                  Giao dịch thứ {index + 1}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Cái Nút Khoe Lên Mạng Xã Hội (Trang trí góc dưới) */}
      <button className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 hover:bg-black active:scale-95 transition-all">
        <MapPin size={18} /> Chia sẻ Hành Trình
      </button>
    </div>
  );
}
