// 全てのデータを1つの配列にマージ（統合）
const rawData = [
    ...data600,
    ...data730
    // 今後 860点などを追加したらここへ ...data860 と書き足すだけ！
];

console.log("単語データの読み込みが完了しました。総数: " + rawData.length);
