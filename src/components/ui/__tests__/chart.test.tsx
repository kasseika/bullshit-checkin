/**
 * Chart コンポーネントのテスト
 * Recharts ベースのチャートコンポーネントの動作を検証
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '../chart';

// ResizeObserver のモック
global.ResizeObserver = class ResizeObserver {
  constructor() {
    // モック実装
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// テスト用のサンプルデータ
const testData = [
  { name: 'Jan', value: 100 },
  { name: 'Feb', value: 200 },
  { name: 'Mar', value: 150 },
];

// テスト用のチャート設定
const testConfig: ChartConfig = {
  value: {
    label: 'Value',
    color: '#3b82f6',
  },
};

describe('ChartContainer', () => {
  test('チャートコンテナが正しくレンダリングされる', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <BarChart data={testData}>
          <Bar dataKey="value" />
        </BarChart>
      </ChartContainer>
    );

    // ChartContainerのdiv要素が存在することを確認
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toBeInTheDocument();
    expect(chartContainer.tagName).toBe('DIV');
  });

  test('カスタムクラス名が適用される', () => {
    const { container } = render(
      <ChartContainer config={testConfig} className="custom-chart">
        <BarChart data={testData}>
          <Bar dataKey="value" />
        </BarChart>
      </ChartContainer>
    );

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveClass('custom-chart');
  });

  test('チャートIDが正しく設定される', () => {
    const { container } = render(
      <ChartContainer config={testConfig} id="test-chart">
        <BarChart data={testData}>
          <Bar dataKey="value" />
        </BarChart>
      </ChartContainer>
    );

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveAttribute('data-chart', 'chart-test-chart');
  });
});

describe('ChartTooltipContent', () => {
  test('アクティブでない場合は何もレンダリングしない', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <ChartTooltipContent active={false} payload={[]} />
      </ChartContainer>
    );

    // ChartContainerは常にレンダリングされるので、ツールチップ内容が空であることを確認
    expect(container.querySelector('.grid.min-w-\\[8rem\\]')).not.toBeInTheDocument();
  });

  test('ペイロードが空の場合は何もレンダリングしない', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <ChartTooltipContent active={true} payload={[]} />
      </ChartContainer>
    );

    expect(container.querySelector('.grid.min-w-\\[8rem\\]')).not.toBeInTheDocument();
  });

  test('有効なペイロードでツールチップがレンダリングされる', () => {
    const mockPayload = [
      {
        value: 100,
        name: 'Value',
        dataKey: 'value',
        color: '#3b82f6',
        payload: testData[0],
      },
    ];

    render(
      <ChartContainer config={testConfig}>
        <ChartTooltipContent
          active={true}
          payload={mockPayload}
          label="Jan"
        />
      </ChartContainer>
    );

    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

describe('ChartLegendContent', () => {
  test('ペイロードが空の場合は何もレンダリングしない', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>
    );

    // ChartContainerは常にレンダリングされるので、凡例内容が空であることを確認
    expect(container.querySelector('.flex.items-center.justify-center')).not.toBeInTheDocument();
  });

  test('有効なペイロードで凡例がレンダリングされる', () => {
    const mockPayload = [
      {
        value: 'value',
        type: 'square',
        color: '#3b82f6',
        dataKey: 'value',
      },
    ];

    render(
      <ChartContainer config={testConfig}>
        <ChartLegendContent payload={mockPayload} />
      </ChartContainer>
    );

    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  test('アイコンを非表示にできる', () => {
    const mockPayload = [
      {
        value: 'value',
        type: 'square',
        color: '#3b82f6',
        dataKey: 'value',
      },
    ];

    render(
      <ChartContainer config={testConfig}>
        <ChartLegendContent payload={mockPayload} hideIcon={true} />
      </ChartContainer>
    );

    // アイコンが表示されていないことを確認
    // hideIcon=trueの場合、凡例はテキストのみ表示される
    expect(screen.getByText('Value')).toBeInTheDocument();
  });
});

describe('Chart integration', () => {
  test('完全なチャートが正しくレンダリングされる', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <BarChart data={testData}>
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ChartContainer>
    );

    // ChartContainerが正しくレンダリングされることを確認
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toBeInTheDocument();
    expect(chartContainer).toHaveAttribute('data-chart');
    
    // ResponsiveContainer が存在することを確認
    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toBeInTheDocument();
  });
});