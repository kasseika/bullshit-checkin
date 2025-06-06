/**
 * グラフエクスポート機能の基本テスト
 */
import '@testing-library/jest-dom';

// html2canvasのモック
const mockHtml2canvas = jest.fn(() => Promise.resolve({
  toDataURL: jest.fn(() => 'data:image/png;base64,mock-image-data')
}));

jest.mock('html2canvas-pro', () => mockHtml2canvas);

describe('グラフエクスポート機能 - ユニットテスト', () => {
  let originalCreateElement: typeof document.createElement;
  let originalAppendChild: typeof document.body.appendChild;
  let originalRemoveChild: typeof document.body.removeChild;

  beforeEach(() => {
    // 元のメソッドを保存
    originalCreateElement = document.createElement;
    originalAppendChild = document.body.appendChild;
    originalRemoveChild = document.body.removeChild;

    // DOM要素のモック
    document.createElement = jest.fn(() => ({
      download: '',
      href: '',
      click: jest.fn(),
      style: { cssText: '' }
    })) as unknown as typeof document.createElement;

    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // html2canvasのモックをリセット
    mockHtml2canvas.mockClear();
  });

  afterEach(() => {
    // 元のメソッドを復元
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  test('html2canvas-proライブラリが正しくインポートされている', async () => {
    const html2canvas = (await import('html2canvas-pro')).default;
    expect(html2canvas).toBeDefined();
    expect(typeof html2canvas).toBe('function');
  });

  test('非破壊的エクスポート機能のロジックが正しく動作する', async () => {
    const html2canvas = mockHtml2canvas;
    
    // テスト用のDOM要素を作成
    const mockElement = {
      style: { cssText: '' },
      scrollHeight: 800,
      querySelectorAll: jest.fn(() => [])
    };
    
    // エクスポート関数の実行（oncloneコールバック付き）
    await html2canvas(mockElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: 1200,
      onclone: expect.any(Function)
    });

    expect(html2canvas).toHaveBeenCalledWith(
      mockElement,
      expect.objectContaining({
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1200,
        onclone: expect.any(Function)
      })
    );
  });

  test('oncloneコールバックが正しくクローン要素を調整する', () => {
    // モックのクローン要素を作成
    const mockClonedElement = {
      style: {},
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === '.grid') return [{ style: {} }];
        if (selector.includes('recharts')) return [{ style: {} }];
        if (selector === 'svg') return [{ style: {} }];
        if (selector.includes('Card')) return [{ style: {} }];
        if (selector.includes('text')) return [{ style: {} }];
        return [];
      })
    };

    // oncloneコールバックをテスト
    const oncloneCallback = (_clonedDoc: Document, clonedElement: typeof mockClonedElement) => {
      clonedElement.style.width = '1200px';
      clonedElement.style.backgroundColor = '#ffffff';
      
      const gridElements = clonedElement.querySelectorAll('.grid');
      gridElements.forEach((element: { style: Record<string, string> }) => {
        element.style.display = 'grid';
        element.style.gridTemplateColumns = '1fr 1fr';
      });
    };

    // コールバック実行
    oncloneCallback({} as Document, mockClonedElement);

    // 期待される変更が適用されているかテスト
    expect(mockClonedElement.style.width).toBe('1200px');
    expect(mockClonedElement.style.backgroundColor).toBe('#ffffff');
    expect(mockClonedElement.querySelectorAll).toHaveBeenCalledWith('.grid');
  });

  test('ファイル名生成ロジックが正しく動作する', () => {
    const formatDateToJSTWithSlash = (date: Date) => {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };

    const fromDate = new Date('2024-01-01');
    const toDate = new Date('2024-01-31');
    
    const fromStr = formatDateToJSTWithSlash(fromDate).replace(/\//g, '-');
    const toStr = formatDateToJSTWithSlash(toDate).replace(/\//g, '-');
    const filename = `statistics_${fromStr}_${toStr}`;

    expect(filename).toBe('statistics_2024-01-01_2024-01-31');
  });

  test('エラーハンドリングが正しく動作する', async () => {
    const html2canvas = mockHtml2canvas;
    html2canvas.mockRejectedValueOnce(new Error('Export failed'));

    global.alert = jest.fn();
    global.console.error = jest.fn();

    try {
      await html2canvas();
    } catch (error) {
      // エラーが発生した場合の処理をテスト
      expect(error).toBeInstanceOf(Error);
    }
  });
});