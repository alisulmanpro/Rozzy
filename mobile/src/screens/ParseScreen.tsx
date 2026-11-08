import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from "react-native";
import { parseSentence } from "../api";
import type { ParseResponse } from "../types";

// First screen to prove the pipeline: type a sentence -> see parsed items.
// Replace with the real Bill screen later (voice button, bill list, total, print).
export default function ParseScreen() {
  const [text, setText] = useState("do kilo ata 40 rupee, or chawal 40 rupe");
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    try { setError(null); setResult(await parseSentence(text)); }
    catch (e) { setError(String(e)); }
  };

  return (
    <ScrollView contentContainerStyle={s.box}>
      <Text style={s.title}>Rozzy</Text>
      <TextInput style={s.input} value={text} onChangeText={setText} multiline />
      <Button title="Parse" onPress={run} />
      {error && <Text style={s.err}>{error}</Text>}
      {result?.items.map((it, i) => (
        <View key={i} style={[s.card, it.needs_review && s.review]}>
          <Text style={s.prod}>{it.product}</Text>
          <Text>{it.qty ?? "-"} {it.unit ?? ""}  |  price {it.price ?? "-"} ({it.price_type ?? "-"} per {it.price_per ?? "-"})</Text>
          <Text>line total: {it.line_total ?? "-"}</Text>
          {it.needs_review && <Text style={s.err}>Check this item</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { padding: 16, gap: 12, backgroundColor: "#F7F5FF" },
  title: { fontSize: 28, fontWeight: "700", color: "#7B2CF5" },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, minHeight: 70 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, gap: 4 },
  review: { borderWidth: 2, borderColor: "#FFA13B" },
  prod: { fontSize: 18, fontWeight: "600", color: "#14123A" },
  err: { color: "#F03E5A" },
});
