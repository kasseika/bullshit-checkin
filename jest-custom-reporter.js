/* eslint-disable no-unused-vars */
/**
 * カスタムJestレポーター
 * テスト実行中の冗長なログを抑制し、結果のサマリーのみを表示します
 */
class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
  }

  // テスト実行開始時
  onRunStart(_results, _options) {
    console.log('\nテストを実行中...\n');
  }

  // テストファイル実行開始時（何も表示しない）
  onTestFileStart(_test) {
    // 「RUNS」メッセージを表示しない
  }

  // テストファイル実行結果
  onTestFileResult(_test, testResult, _aggregatedResult) {
    // テストファイルが失敗した場合のみ詳細を表示
    if (testResult.numFailingTests > 0) {
      console.log(`\n❌ ${testResult.testFilePath.split('/').pop()}: ${testResult.numFailingTests}個のテストが失敗`);
      
      // 失敗したテストの詳細を表示
      testResult.testResults.forEach(result => {
        if (result.status === 'failed') {
          console.log(`  - ${result.title}: ${result.failureMessages[0].split('\n')[0]}`);
        }
      });
    }
  }

  // テスト実行完了時
  onRunComplete(contexts, results) {
    const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
    
    console.log('\n📊 テスト結果サマリー:');
    console.log(`✅ 成功: ${numPassedTests}/${numTotalTests}`);
    
    if (numFailedTests > 0) {
      console.log(`❌ 失敗: ${numFailedTests}/${numTotalTests}`);
    }
    
    if (numPendingTests > 0) {
      console.log(`⏳ 保留: ${numPendingTests}/${numTotalTests}`);
    }
    
    console.log(`⏱️ 実行時間: ${(results.startTime ? (Date.now() - results.startTime) / 1000 : 0).toFixed(1)}秒\n`);
  }
}

module.exports = CustomReporter;