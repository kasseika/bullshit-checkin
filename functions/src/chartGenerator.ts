/**
 * Chart.jsを使用してグラフ画像を生成するユーティリティ
 */
import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

// 統計データの型定義
export interface StatsData {
  ageGroupStats: Record<string, number>;
  purposeStats: Record<string, number>;
  dayOfWeekStats: Record<string, number>;
  timeSlotStats: Record<string, number>;
  roomStats: Record<string, number>;
  participantCountStats: Record<string, number>;
  dailyUsersData: Array<{
    date: string;
    users: number;
  }>;
}

// 表示用ラベルのマッピング
const LABELS = {
  ageGroup: {
    under20: "10代以下",
    twenties: "20代",
    thirties: "30代",
    forties: "40代",
    fifties: "50代",
    over60: "60代以上",
    unknown: "不明"
  },
  purpose: {
    meeting: "会議・打合せ",
    telework: "テレワーク",
    study: "学習",
    event: "イベント・講座",
    digital: "デジタル制作",
    inspection: "視察・見学",
    other: "その他",
    unknown: "不明"
  },
  dayOfWeek: {
    monday: "月",
    tuesday: "火",
    wednesday: "水",
    thursday: "木",
    friday: "金",
    saturday: "土",
    sunday: "日"
  },
  timeSlot: {
    morning: "午前",
    afternoon: "午後",
    evening: "夜",
    unknown: "不明"
  }
};

/**
 * 棒グラフを生成
 */
function createBarChart(
  title: string,
  labels: string[],
  data: number[],
  width: number = 800,
  height: number = 400
): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '利用者数',
        data,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18,
            weight: 'bold',
            family: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif'
          },
          padding: 20
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              family: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif'
            }
          }
        },
        x: {
          ticks: {
            font: {
              family: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif'
            }
          }
        }
      }
    },
    plugins: [{
      id: 'customDataLabels',
      afterDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          meta.data.forEach((bar, index) => {
            const data = dataset.data[index] as number;
            if (data > 0) {
              ctx.fillStyle = '#374151';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(data.toString(), bar.x, bar.y - 5);
            }
          });
        });
      }
    }]
  };
}

/**
 * 円グラフを生成
 */
function createPieChart(
  title: string,
  labels: string[],
  data: number[],
  width: number = 800,
  height: number = 400
): ChartConfiguration {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  return {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18,
            weight: 'bold',
            family: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif'
          },
          padding: 20
        },
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 12,
              family: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif'
            },
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels && data.datasets.length) {
                const dataset = data.datasets[0];
                const total = (dataset.data as number[]).reduce((acc, val) => acc + val, 0);

                return data.labels.map((label, i) => {
                  const value = (dataset.data as number[])[i];
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return {
                    text: `${label}: ${value}人 (${percentage}%)`,
                    fillStyle: (dataset.backgroundColor as string[])[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        }
      }
    }
  };
}

/**
 * 複数のグラフ画像を縦に結合
 */
async function combineChartsVertically(
  chartBuffers: Buffer[],
  width: number,
  totalHeight: number
): Promise<Buffer> {
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(width, totalHeight);
  const ctx = canvas.getContext('2d');

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  let currentY = 0;
  for (const buffer of chartBuffers) {
    const { loadImage } = await import('canvas');
    const image = await loadImage(buffer);
    ctx.drawImage(image, 0, currentY);
    currentY += image.height;
  }

  return canvas.toBuffer('image/png');
}

/**
 * 統計データから全グラフを生成
 */
export async function generateStatisticsImage(
  stats: StatsData,
  period: { year: number; month: number }
): Promise<Buffer> {
  const width = 1200;
  const chartHeight = 400;
  const padding = 40;

  // Chart.jsのキャンバスインスタンスを作成（日本語フォント設定）
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height: chartHeight,
    backgroundColour: 'white',
    chartCallback: (ChartJS) => {
      // デフォルトフォントを日本語フォントに設定
      // Hiragino Kaku Gothic ProNを優先（macOS標準の日本語フォント）
      ChartJS.defaults.font.family = '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif';
    }
  });

  const chartBuffers: Buffer[] = [];

  // 1. 日別利用者数グラフ
  if (stats.dailyUsersData.length > 0) {
    const dailyLabels = stats.dailyUsersData.map(d => d.date);
    const dailyData = stats.dailyUsersData.map(d => d.users);
    const dailyChart = createBarChart('日別利用者数', dailyLabels, dailyData, width, chartHeight);
    chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(dailyChart));
  }

  // 2. 年代別利用統計
  const ageOrder = ['under20', 'twenties', 'thirties', 'forties', 'fifties', 'over60', 'unknown'];
  const ageLabels = ageOrder.map(key => LABELS.ageGroup[key as keyof typeof LABELS.ageGroup]);
  const ageData = ageOrder.map(key => stats.ageGroupStats[key] || 0);
  const ageChart = createBarChart('年代別利用統計', ageLabels, ageData, width, chartHeight);
  chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(ageChart));

  // 3. 目的別利用統計
  const purposeOrder = ['meeting', 'telework', 'study', 'event', 'digital', 'inspection', 'other', 'unknown'];
  const purposeLabels = purposeOrder.map(key => LABELS.purpose[key as keyof typeof LABELS.purpose]);
  const purposeData = purposeOrder.map(key => stats.purposeStats[key] || 0);
  const purposeChart = createBarChart('目的別利用統計', purposeLabels, purposeData, width, chartHeight);
  chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(purposeChart));

  // 4. 曜日別利用統計
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = dayOrder.map(key => LABELS.dayOfWeek[key as keyof typeof LABELS.dayOfWeek]);
  const dayData = dayOrder.map(key => stats.dayOfWeekStats[key] || 0);
  const dayChart = createBarChart('曜日別利用統計', dayLabels, dayData, width, chartHeight);
  chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(dayChart));

  // 5. 時間帯別利用状況（円グラフ）
  const timeSlotEntries = Object.entries(stats.timeSlotStats).filter(([, value]) => value > 0);
  if (timeSlotEntries.length > 0) {
    const timeSlotLabels = timeSlotEntries.map(([key]) =>
      LABELS.timeSlot[key as keyof typeof LABELS.timeSlot]
    );
    const timeSlotData = timeSlotEntries.map(([, value]) => value);
    const timeSlotChart = createPieChart('時間帯別利用状況', timeSlotLabels, timeSlotData, width, chartHeight);
    chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(timeSlotChart));
  }

  // 6. 部屋別利用統計
  const roomOrder = ["1番", "4番個室", "4番大部屋", "6番大部屋", "6番工作室", "見学"];
  const roomLabels = roomOrder;
  const roomData = roomOrder.map(room => stats.roomStats[room] || 0);
  const roomChart = createBarChart('部屋別利用統計', roomLabels, roomData, width, chartHeight);
  chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(roomChart));

  // 7. 人数別チェックイン統計
  const participantEntries = Object.entries(stats.participantCountStats)
    .filter(([, count]) => count > 0)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  if (participantEntries.length > 0) {
    const participantLabels = participantEntries.map(([people]) => `${people}人`);
    const participantData = participantEntries.map(([, count]) => count);
    const participantChart = createBarChart('人数別チェックイン統計', participantLabels, participantData, width, chartHeight);
    chartBuffers.push(await chartJSNodeCanvas.renderToBuffer(participantChart));
  }

  // すべてのグラフを縦に結合
  if (chartBuffers.length === 0) {
    // グラフがない場合はエラー
    throw new Error('No charts generated');
  }

  const totalHeight = chartBuffers.length * (chartHeight + padding) + padding;
  return combineChartsVertically(chartBuffers, width, totalHeight);
}
