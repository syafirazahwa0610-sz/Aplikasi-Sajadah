import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { judul: string; isi: string; onCobaLagi?: () => void };

export default function StatusKosong({ judul, isi, onCobaLagi }: Props) {
  return (
    <View style={s.wadah}>
      <Text style={s.ikon}>📡</Text>
      <Text style={s.judul}>{judul}</Text>
      <Text style={s.isi}>{isi}</Text>
      {onCobaLagi && (
        <Pressable style={s.tombol} onPress={onCobaLagi}>
          <Text style={s.tombolTeks}>Coba Lagi</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { alignItems: "center", padding: 24, marginTop: 24 },
  ikon: { fontSize: 56, marginBottom: 12 },
  judul: { fontSize: 20, fontWeight: "bold", color: "#3B2412", textAlign: "center" },
  isi: { color: "#6B5239", textAlign: "center", marginTop: 8, lineHeight: 22 },
  tombol: { marginTop: 20, backgroundColor: "#5A3A1E", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 24 },
  tombolTeks: { color: "#fff", fontWeight: "600" },
}); 