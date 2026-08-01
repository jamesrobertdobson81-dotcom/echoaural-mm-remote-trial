function runTextureTrainerMarkingChecks({ textureQuestions, textureQuestionSystem, fail }) {
  function getQuestion(id) {
    const question = textureQuestions.find((item) => item.id === id);
    if (!question) fail(`Texture Trainer marking regression missing ${id}.`);
    return question;
  }

  function expectMarks(id, answer, expectedMarks, label) {
    const question = getQuestion(id);
    const result = textureQuestionSystem.markAnswer(question, answer);
    if (Number(result.marksAwarded) !== expectedMarks) {
      fail(`${label} expected ${expectedMarks}/${question.maxMarks}, got ${result.marksAwarded}/${result.maxMarks}.`);
    }
  }

  expectMarks(
    "TT093",
    "Melody and accompaniment. The melody is supported by parts moving together.",
    2,
    "Texture Trainer homophonic melody-and-accompaniment answer"
  );

  expectMarks(
    "TT093",
    "The texture is homophonic. A main tune is supported by the other parts.",
    2,
    "Texture Trainer homophonic supported-main-tune answer"
  );

  expectMarks(
    "TT093",
    "Monophonic; there is only one melody line.",
    0,
    "Texture Trainer distinct monophonic/homophonic guard"
  );

  expectMarks(
    "TT112",
    "Contrapuntal with two independent parts.",
    2,
    "Texture Trainer polyphonic independent-parts answer"
  );

  expectMarks(
    "TT112",
    "There are 2 independent melodic lines that are weighted equally.",
    2,
    "Texture Trainer numeric independent-lines equal-weight answer"
  );

  expectMarks(
    "TT112",
    "There are two independent melody lines and neither is just accompaniment.",
    2,
    "Texture Trainer no-single-accompaniment answer"
  );

  expectMarks(
    "TT134",
    "Several independent melodic lines overlap and enter at different times.",
    2,
    "Texture Trainer overlapping independent-lines answer"
  );

  expectMarks(
    "TT123",
    "They play different versions of the same tune together.",
    1,
    "Texture Trainer heterophony definition-only answer"
  );

  expectMarks(
    "TT122",
    "Heterophonic",
    1,
    "Texture Trainer heterophonic multiple-choice answer"
  );

  expectMarks(
    "TT122",
    "Heterophony",
    1,
    "Texture Trainer heterophony equivalent multiple-choice answer"
  );

  expectMarks(
    "TT108",
    "It has a tune with backing chords underneath.",
    2,
    "Texture Trainer melody-with-backing answer"
  );
}

module.exports = { runTextureTrainerMarkingChecks };
