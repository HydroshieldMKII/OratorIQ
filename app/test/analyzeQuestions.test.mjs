import { strict as assert } from 'assert';
import { analyzeQuestions, addQuestionTrainingData } from '../src/server.mjs';

describe('analyzeQuestions', function () {
  before(async function () {
    await addQuestionTrainingData();
  });

  it('counts questions in a small French corpus', async function () {
    const corpus = 'Bonjour. Comment allez-vous? C\'est un test. Qui etes-vous?';
    const result = await analyzeQuestions(corpus);
    assert.equal(result.questionCount, 2);
  });
});
