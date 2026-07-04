const melodyClips = [
  {
    "id": "MM001",
    "file": "questions/MM001/MM001-audio.mp3",
    "questionImage": "questions/MM001/MM001-question.png",
    "answerImage": "questions/MM001/MM001-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "G4",
      "G4",
      "A4",
      "B4",
      "C5",
      "D5"
    ],
    "noteImage": "assets/icons/notes/semiquaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/semiquaver-sibelis.png",
    "dictationLayout": {
      "topLinePitch": "E5",
      "staffTopY": 31.5,
      "staffStepY": 4.95,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 semiquavers",
      "slots": [
        {
          "x": 70.6,
          "pitch": "G4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 73.6,
          "pitch": "G4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 76.6,
          "pitch": "A4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 79.6,
          "pitch": "B4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 82.6,
          "pitch": "C5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 85.6,
          "pitch": "D5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        }
      ]
    },
    "notes": "Students drag each note down from above the stave onto any stave line or space, then check against the answer pitches.",
    "composer": "W. A. Mozart",
    "work": "Sonata facile, K.545",
    "movement": "2nd movement",
    "source": "Mozart Sonata facile, 2nd movement",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "G4",
          "G4",
          "A4",
          "B4",
          "C5",
          "D5"
        ],
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver"
        ],
        "xPositions": [
          70.6,
          73.6,
          76.6,
          79.6,
          82.6,
          85.6
        ],
        "range": "G4-D5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "G4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 70.6,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "G4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 73.6,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "A4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 76.6,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "B4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 79.6,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "C5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 82.6,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "D5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 85.6,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "same",
          "up step",
          "up step",
          "up step",
          "up step"
        ],
        "intervalProfile": [
          "repeated note",
          "step",
          "step",
          "step",
          "step"
        ],
        "repeatedNotes": [
          "1-2: G4→G4 (same)"
        ],
        "stepwiseMotion": [
          "2-3: G4→A4 (up step)",
          "3-4: A4→B4 (up step)",
          "4-5: B4→C5 (up step)",
          "5-6: C5→D5 (up step)"
        ],
        "thirds": [],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "6 semiquavers",
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "repeated notes",
        "stepwise motion",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 7,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 7s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 7,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 7s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM002",
    "file": "questions/mm002/MM002-audio.mp3",
    "questionImage": "questions/mm002/mm002-question.png",
    "answerImage": "questions/mm002/mm002-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "E5",
      "B4",
      "C5",
      "B4",
      "D5",
      "D5"
    ],
    "noteImage": "assets/icons/notes/semiquaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/semiquaver-sibelis.png",
    "dictationLayout": {
      "topLinePitch": "E5",
      "staffTopY": 35.1,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 notes",
      "staffPitches": [
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 35.45,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 42.49,
          "pitch": "B4",
          "icon": "assets/icons/notes/dottedquaver-sibelius.png",
          "rhythm": "dotted quaver"
        },
        {
          "x": 49.07,
          "pitch": "C5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver",
          "acceptedPitches": [
            "C5"
          ],
          "visualAnchorY": 86.75
        },
        {
          "x": 53.43,
          "pitch": "B4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 59.05,
          "pitch": "D5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 66.84,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 2 uses mixed note values: quaver, dotted quaver, semiquaver, quaver, crotchet, quaver.",
    "composer": "Composer to confirm",
    "work": "MM002 source to confirm",
    "movement": "Extract 2",
    "source": "MM002 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "E5",
          "B4",
          "C5",
          "B4",
          "D5",
          "D5"
        ],
        "rhythmSequence": [
          "quaver",
          "dotted quaver",
          "semiquaver",
          "quaver",
          "crotchet",
          "quaver"
        ],
        "xPositions": [
          35.45,
          42.49,
          49.07,
          53.43,
          59.05,
          66.84
        ],
        "range": "B4-E5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 35.45,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "B4",
          "rhythm": "dotted quaver",
          "icon": "dottedquaver-sibelius.png",
          "x": 42.49,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "C5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 49.07,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false,
          "visualAnchorY": 86.75,
          "acceptedPitches": [
            "C5"
          ]
        },
        {
          "slot": 4,
          "pitch": "B4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 53.43,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "D5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 59.05,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 66.84,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "down fourth",
          "up step",
          "down step",
          "up third",
          "same"
        ],
        "intervalProfile": [
          "fourth/larger leap",
          "step",
          "step",
          "third",
          "repeated note"
        ],
        "repeatedNotes": [
          "5-6: D5→D5 (same)"
        ],
        "stepwiseMotion": [
          "2-3: B4→C5 (up step)",
          "3-4: C5→B4 (down step)"
        ],
        "thirds": [
          "4-5: B4→D5 (up third)"
        ],
        "fourthsOrLargerLeaps": [
          "1-2: E5→B4 (down fourth)"
        ],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "3 quavers, 1 dotted quaver, 1 semiquaver, 1 crotchet",
        "rhythmSequence": [
          "quaver",
          "dotted quaver",
          "semiquaver",
          "quaver",
          "crotchet",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [
          {
            "slot": 3,
            "pitch": "C5",
            "visualAnchorY": 86.75
          }
        ],
        "acceptedPitchOverrides": [
          {
            "slot": 3,
            "pitch": "C5",
            "acceptedPitches": [
              "C5"
            ]
          }
        ]
      },
      "diagnosticTags": [
        "repeated notes",
        "stepwise motion",
        "thirds",
        "fourth/larger leaps",
        "rhythm:crotchet",
        "rhythm:dotted quaver",
        "rhythm:quaver",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 8,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 8s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 8,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 8s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM003",
    "file": "questions/mm003/MM003-audio.mp3",
    "questionImage": "questions/mm003/mm003-question.png",
    "answerImage": "questions/mm003/mm003-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "C5",
      "E5",
      "D5",
      "C5",
      "B4",
      "G4"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 quavers",
      "staffPitches": [
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 54.35,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 57.76,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 61.21,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 64.67,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 68.12,
          "pitch": "B4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 72.97,
          "pitch": "G4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 3 uses six missing quavers. X positions are taken from the visual centre of each missing notehead in the answer PNG. Corrected pitch sequence: C5, E5, D5, C5, B4, G4.",
    "composer": "Composer to confirm",
    "work": "MM003 source to confirm",
    "movement": "Extract 3",
    "source": "MM003 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "C5",
          "E5",
          "D5",
          "C5",
          "B4",
          "G4"
        ],
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          54.35,
          57.76,
          61.21,
          64.67,
          68.12,
          72.97
        ],
        "range": "G4-E5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 54.35,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 57.76,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 61.21,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 64.67,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "B4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 68.12,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "G4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 72.97,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up third",
          "down step",
          "down step",
          "down step",
          "down third"
        ],
        "intervalProfile": [
          "third",
          "step",
          "step",
          "step",
          "third"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "2-3: E5→D5 (down step)",
          "3-4: D5→C5 (down step)",
          "4-5: C5→B4 (down step)"
        ],
        "thirds": [
          "1-2: C5→E5 (up third)",
          "5-6: B4→G4 (down third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "6 quavers",
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 8,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 8s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 8,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 8s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM004",
    "file": "questions/mm004/MM004-audio.mp3",
    "questionImage": "questions/mm004/mm004-question.png",
    "answerImage": "questions/mm004/mm004-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "F5",
      "F5",
      "C5",
      "E5",
      "E5",
      "E5"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 notes",
      "staffPitches": [
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 26.95,
          "pitch": "F5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 31.59,
          "pitch": "F5",
          "icon": "assets/icons/notes/dottedcrotchet-sibelius.png",
          "rhythm": "dotted crotchet"
        },
        {
          "x": 40.28,
          "pitch": "C5",
          "icon": "assets/icons/notes/dottedcrotchet-sibelius.png",
          "rhythm": "dotted crotchet"
        },
        {
          "x": 50.34,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 54.98,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 59.64,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 4 uses six missing notes. Visual centres were taken from the answer PNG. Rhythms are quaver, dotted crotchet, dotted crotchet, quaver, quaver, quaver.",
    "composer": "Composer to confirm",
    "work": "MM004 source to confirm",
    "movement": "Extract 4",
    "source": "MM004 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "F5",
          "F5",
          "C5",
          "E5",
          "E5",
          "E5"
        ],
        "rhythmSequence": [
          "quaver",
          "dotted crotchet",
          "dotted crotchet",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          26.95,
          31.59,
          40.28,
          50.34,
          54.98,
          59.64
        ],
        "range": "C5-F5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "F5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 26.95,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "F5",
          "rhythm": "dotted crotchet",
          "icon": "dottedcrotchet-sibelius.png",
          "x": 31.59,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "C5",
          "rhythm": "dotted crotchet",
          "icon": "dottedcrotchet-sibelius.png",
          "x": 40.28,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 50.34,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 54.98,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 59.64,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "same",
          "down fourth",
          "up third",
          "same",
          "same"
        ],
        "intervalProfile": [
          "repeated note",
          "fourth/larger leap",
          "third",
          "repeated note",
          "repeated note"
        ],
        "repeatedNotes": [
          "1-2: F5→F5 (same)",
          "4-5: E5→E5 (same)",
          "5-6: E5→E5 (same)"
        ],
        "stepwiseMotion": [],
        "thirds": [
          "3-4: C5→E5 (up third)"
        ],
        "fourthsOrLargerLeaps": [
          "2-3: F5→C5 (down fourth)"
        ],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "4 quavers, 2 dotted crotchets",
        "rhythmSequence": [
          "quaver",
          "dotted crotchet",
          "dotted crotchet",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "repeated notes",
        "thirds",
        "fourth/larger leaps",
        "rhythm:dotted crotchet",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM005",
    "file": "questions/mm005/MM005-audio.mp3",
    "questionImage": "questions/mm005/mm005-question.png",
    "answerImage": "questions/mm005/mm005-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "A4",
      "B4",
      "D5",
      "F4",
      "G4",
      "A4"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 quavers",
      "staffPitches": [
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 28.69,
          "pitch": "A4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 35.25,
          "pitch": "B4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 41.85,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 48.39,
          "pitch": "F4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 55,
          "pitch": "G4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 62.92,
          "pitch": "A4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 5 uses six missing notes. Visual centres were taken from the answer PNG. Pitch sequence provided by user: A4, B4, D5, F4, G4, A4. All six rhythms are quavers.",
    "composer": "Composer to confirm",
    "work": "MM005 source to confirm",
    "movement": "Extract 5",
    "source": "MM005 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "A4",
          "B4",
          "D5",
          "F4",
          "G4",
          "A4"
        ],
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          28.69,
          35.25,
          41.85,
          48.39,
          55,
          62.92
        ],
        "range": "F4-D5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "A4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 28.69,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "B4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 35.25,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 41.85,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "F4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 48.39,
          "register": "below-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "G4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 55,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "A4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 62.92,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up step",
          "up third",
          "down sixth",
          "up step",
          "up step"
        ],
        "intervalProfile": [
          "step",
          "third",
          "fourth/larger leap",
          "step",
          "step"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: A4→B4 (up step)",
          "4-5: F4→G4 (up step)",
          "5-6: G4→A4 (up step)"
        ],
        "thirds": [
          "2-3: B4→D5 (up third)"
        ],
        "fourthsOrLargerLeaps": [
          "3-4: D5→F4 (down sixth)"
        ],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "6 quavers",
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "fourth/larger leaps",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 11,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 11s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 11,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 11s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM006",
    "file": "questions/mm006/MM006-audio.mp3",
    "questionImage": "questions/mm006/mm006-question.png",
    "answerImage": "questions/mm006/mm006-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "F5",
      "G5",
      "F5",
      "E5",
      "C5",
      "D5"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "1 crotchet, 4 quavers, 1 minim",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 52.78,
          "pitch": "F5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 58.01,
          "pitch": "G5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 61.79,
          "pitch": "F5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 65.58,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 69.38,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 74.56,
          "pitch": "D5",
          "icon": "assets/icons/notes/minim-sibelius.png",
          "rhythm": "minim"
        }
      ]
    },
    "notes": "Question 6 uses six missing notes. Pitch sequence provided by user: F5, G5, F5, E5, C5, D5. Rhythms are crotchet, four quavers, and minim.",
    "composer": "Composer to confirm",
    "work": "MM006 source to confirm",
    "movement": "Extract 6",
    "source": "MM006 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "F5",
          "G5",
          "F5",
          "E5",
          "C5",
          "D5"
        ],
        "rhythmSequence": [
          "crotchet",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "minim"
        ],
        "xPositions": [
          52.78,
          58.01,
          61.79,
          65.58,
          69.38,
          74.56
        ],
        "range": "C5-G5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "F5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 52.78,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "G5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 58.01,
          "register": "just above stave",
          "aboveStave": true,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "F5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 61.79,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 65.58,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 69.38,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "D5",
          "rhythm": "minim",
          "icon": "minim-sibelius.png",
          "x": 74.56,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up step",
          "down step",
          "down step",
          "down third",
          "up step"
        ],
        "intervalProfile": [
          "step",
          "step",
          "step",
          "third",
          "step"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: F5→G5 (up step)",
          "2-3: G5→F5 (down step)",
          "3-4: F5→E5 (down step)",
          "5-6: C5→D5 (up step)"
        ],
        "thirds": [
          "4-5: E5→C5 (down third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": true,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "1 crotchet, 4 quavers, 1 minim",
        "rhythmSequence": [
          "crotchet",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "minim"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "above stave",
        "rhythm:crotchet",
        "rhythm:minim",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM007",
    "file": "questions/mm007/MM007-audio.mp3",
    "questionImage": "questions/mm007/mm007-question.png",
    "answerImage": "questions/mm007/mm007-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "G5",
      "F5",
      "E5",
      "D5",
      "F5",
      "B4"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "1 crotchet, 2 semiquavers, 3 quavers",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 24.73,
          "pitch": "G5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 31.08,
          "pitch": "F5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 34.57,
          "pitch": "E5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 39.45,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 44.02,
          "pitch": "F5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 48.58,
          "pitch": "B4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 7 uses six missing notes. Pitch sequence provided by user: G5, F5, E5, D5, F5, B4. Rhythms are crotchet, semiquaver, semiquaver, quaver, quaver, quaver.",
    "composer": "Composer to confirm",
    "work": "MM007 source to confirm",
    "movement": "Extract 7",
    "source": "MM007 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "G5",
          "F5",
          "E5",
          "D5",
          "F5",
          "B4"
        ],
        "rhythmSequence": [
          "crotchet",
          "semiquaver",
          "semiquaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          24.73,
          31.08,
          34.57,
          39.45,
          44.02,
          48.58
        ],
        "range": "B4-G5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "G5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 24.73,
          "register": "just above stave",
          "aboveStave": true,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "F5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 31.08,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "E5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 34.57,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 39.45,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "F5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 44.02,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "B4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 48.58,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "down step",
          "down step",
          "down step",
          "up third",
          "down fifth"
        ],
        "intervalProfile": [
          "step",
          "step",
          "step",
          "third",
          "fourth/larger leap"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: G5→F5 (down step)",
          "2-3: F5→E5 (down step)",
          "3-4: E5→D5 (down step)"
        ],
        "thirds": [
          "4-5: D5→F5 (up third)"
        ],
        "fourthsOrLargerLeaps": [
          "5-6: F5→B4 (down fifth)"
        ],
        "aboveStave": true,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "1 crotchet, 2 semiquavers, 3 quavers",
        "rhythmSequence": [
          "crotchet",
          "semiquaver",
          "semiquaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "fourth/larger leaps",
        "above stave",
        "rhythm:crotchet",
        "rhythm:quaver",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 7,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 7s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 7,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 7s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM009",
    "file": "questions/mm009/MM009-audio.mp3",
    "questionImage": "questions/mm009/mm009-question.png",
    "answerImage": "questions/mm009/mm009-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "C5",
      "D5",
      "C5",
      "B4",
      "A4",
      "B4"
    ],
    "noteImage": "assets/icons/notes/semiquaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/semiquaver-sibelis.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "2 semiquavers, 4 demisemiquavers",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 50.95,
          "pitch": "C5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 53.08,
          "pitch": "D5",
          "icon": "assets/icons/notes/demisemiquaver-sibelius.png",
          "rhythm": "demisemiquaver"
        },
        {
          "x": 54.91,
          "pitch": "C5",
          "icon": "assets/icons/notes/demisemiquaver-sibelius.png",
          "rhythm": "demisemiquaver"
        },
        {
          "x": 56.71,
          "pitch": "B4",
          "icon": "assets/icons/notes/demisemiquaver-sibelius.png",
          "rhythm": "demisemiquaver"
        },
        {
          "x": 58.54,
          "pitch": "A4",
          "icon": "assets/icons/notes/demisemiquaver-sibelius.png",
          "rhythm": "demisemiquaver"
        },
        {
          "x": 60.35,
          "pitch": "B4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        }
      ]
    },
    "notes": "Question 9 uses six missing notes. Pitch sequence provided by user: C5, D5, C5, B4, A4, B4. Rhythms are semiquaver, four demisemiquavers, semiquaver. A placeholder demisemiquaver-sibelius.png asset has been added and can be replaced later.",
    "composer": "Composer to confirm",
    "work": "MM009 source to confirm",
    "movement": "Extract 9",
    "source": "MM009 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "C5",
          "D5",
          "C5",
          "B4",
          "A4",
          "B4"
        ],
        "rhythmSequence": [
          "semiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "semiquaver"
        ],
        "xPositions": [
          50.95,
          53.08,
          54.91,
          56.71,
          58.54,
          60.35
        ],
        "range": "A4-D5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "C5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 50.95,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "D5",
          "rhythm": "demisemiquaver",
          "icon": "demisemiquaver-sibelius.png",
          "x": 53.08,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "C5",
          "rhythm": "demisemiquaver",
          "icon": "demisemiquaver-sibelius.png",
          "x": 54.91,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "B4",
          "rhythm": "demisemiquaver",
          "icon": "demisemiquaver-sibelius.png",
          "x": 56.71,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "A4",
          "rhythm": "demisemiquaver",
          "icon": "demisemiquaver-sibelius.png",
          "x": 58.54,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "B4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 60.35,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up step",
          "down step",
          "down step",
          "down step",
          "up step"
        ],
        "intervalProfile": [
          "step",
          "step",
          "step",
          "step",
          "step"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: C5→D5 (up step)",
          "2-3: D5→C5 (down step)",
          "3-4: C5→B4 (down step)",
          "4-5: B4→A4 (down step)",
          "5-6: A4→B4 (up step)"
        ],
        "thirds": [],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "2 semiquavers, 4 demisemiquavers",
        "rhythmSequence": [
          "semiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "demisemiquaver",
          "semiquaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "rhythm:demisemiquaver",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM010",
    "file": "questions/mm010/MM010-audio.mp3",
    "questionImage": "questions/mm010/mm010-question.png",
    "answerImage": "questions/mm010/mm010-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "D5",
      "C5",
      "B4",
      "C5",
      "E5",
      "F5"
    ],
    "noteImage": "assets/icons/notes/semiquaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/semiquaver-sibelis.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "4 semiquavers, 1 quaver, 1 semiquaver",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 28.34,
          "pitch": "D5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 31.32,
          "pitch": "C5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 34.25,
          "pitch": "B4",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 37.23,
          "pitch": "C5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 41.55,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 49.27,
          "pitch": "F5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        }
      ]
    },
    "notes": "Question 10 uses six missing notes. Pitch sequence provided by user: D5, C5, B4, C5, E5, F5. Rhythms are 4 semiquavers, 1 quaver, then 1 semiquaver.",
    "composer": "Composer to confirm",
    "work": "MM010 source to confirm",
    "movement": "Extract 10",
    "source": "MM010 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "D5",
          "C5",
          "B4",
          "C5",
          "E5",
          "F5"
        ],
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "quaver",
          "semiquaver"
        ],
        "xPositions": [
          28.34,
          31.32,
          34.25,
          37.23,
          41.55,
          49.27
        ],
        "range": "B4-F5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "D5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 28.34,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "C5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 31.32,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "B4",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 34.25,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "C5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 37.23,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 41.55,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "F5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 49.27,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "down step",
          "down step",
          "up step",
          "up third",
          "up step"
        ],
        "intervalProfile": [
          "step",
          "step",
          "step",
          "third",
          "step"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: D5→C5 (down step)",
          "2-3: C5→B4 (down step)",
          "3-4: B4→C5 (up step)",
          "5-6: E5→F5 (up step)"
        ],
        "thirds": [
          "4-5: C5→E5 (up third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "5 semiquavers, 1 quaver",
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "quaver",
          "semiquaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "rhythm:quaver",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 5,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 5s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 5,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 5s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM011",
    "file": "questions/mm011/MM011-audio.mp3",
    "questionImage": "questions/mm011/mm011-question.png",
    "answerImage": "questions/mm011/mm011-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "A5",
      "A5",
      "A5",
      "B5",
      "C6",
      "A5"
    ],
    "noteImage": "assets/icons/notes/crotchet-sibelius.png",
    "noteImageFallback": "assets/icons/notes/crotchet-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "2 crotchets, 4 quavers",
      "staffPitches": [
        "C6",
        "B5",
        "A5",
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 51.07,
          "pitch": "A5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 54.66,
          "pitch": "A5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 58.25,
          "pitch": "A5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 60.84,
          "pitch": "B5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 63.43,
          "pitch": "C6",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 66.02,
          "pitch": "A5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "A5",
          "A5",
          "A5",
          "B5",
          "C6",
          "A5"
        ],
        "rhythmSequence": [
          "crotchet",
          "crotchet",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          51.07,
          54.66,
          58.25,
          60.84,
          63.43,
          66.02
        ],
        "range": "A5-C6"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "A5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 51.07,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 2,
          "pitch": "A5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 54.66,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 3,
          "pitch": "A5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 58.25,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 4,
          "pitch": "B5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 60.84,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 5,
          "pitch": "C6",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 63.43,
          "register": "second ledger line above or higher",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 6,
          "pitch": "A5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 66.02,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "same",
          "same",
          "up step",
          "up step",
          "down third"
        ],
        "intervalProfile": [
          "repeated note",
          "repeated note",
          "step",
          "step",
          "third"
        ],
        "repeatedNotes": [
          "1-2: A5→A5 (same)",
          "2-3: A5→A5 (same)"
        ],
        "stepwiseMotion": [
          "3-4: A5→B5 (up step)",
          "4-5: B5→C6 (up step)"
        ],
        "thirds": [
          "5-6: C6→A5 (down third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": true,
        "ledgerLineFocus": [
          "A5 first ledger line above",
          "B5 above first ledger line",
          "C6 second ledger line above"
        ]
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "2 crotchets, 4 quavers",
        "rhythmSequence": [
          "crotchet",
          "crotchet",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "repeated notes",
        "stepwise motion",
        "thirds",
        "above stave",
        "ledger lines",
        "rhythm:crotchet",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "notes": "Question 11 uses six main draggable notes. Pitch sequence provided by user: A5, A5, A5, B5, C6, A5. Rhythms are crotchet, crotchet, quaver, quaver, quaver, quaver. X positions were taken from the visual centres of the six main missing noteheads in the answer PNG. The small printed grace/ornamental note visible in the answer image is preserved in the reveal image but is not treated as a draggable dictation slot.",
    "composer": "Composer to confirm",
    "work": "MM011 source to confirm",
    "movement": "Extract 11",
    "source": "MM011 source to confirm",
    "rights": "Prototype",
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM012",
    "file": "questions/mm012/MM012-audio.mp3",
    "questionImage": "questions/mm012/mm012-question.png",
    "answerImage": "questions/mm012/mm012-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "D5",
      "C5",
      "F5",
      "D5",
      "B4",
      "C5"
    ],
    "noteImage": "assets/icons/notes/crotchet-sibelius.png",
    "noteImageFallback": "assets/icons/notes/crotchet-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "1 crotchet, 2 quavers, 3 crotchets",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 42.65,
          "pitch": "D5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 52.91,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 58.23,
          "pitch": "F5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 63.6,
          "pitch": "D5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 70.97,
          "pitch": "B4",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        },
        {
          "x": 78.37,
          "pitch": "C5",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet"
        }
      ]
    },
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "D5",
          "C5",
          "F5",
          "D5",
          "B4",
          "C5"
        ],
        "rhythmSequence": [
          "crotchet",
          "quaver",
          "quaver",
          "crotchet",
          "crotchet",
          "crotchet"
        ],
        "xPositions": [
          42.65,
          52.91,
          58.23,
          63.6,
          70.97,
          78.37
        ],
        "range": "B4-F5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "D5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 42.65,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 52.91,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "F5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 58.23,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "D5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 63.6,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "B4",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 70.97,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "C5",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 78.37,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "down step",
          "up fourth",
          "down third",
          "down third",
          "up step"
        ],
        "intervalProfile": [
          "step",
          "fourth/larger leap",
          "third",
          "third",
          "step"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: D5→C5 (down step)",
          "5-6: B4→C5 (up step)"
        ],
        "thirds": [
          "3-4: F5→D5 (down third)",
          "4-5: D5→B4 (down third)"
        ],
        "fourthsOrLargerLeaps": [
          "2-3: C5→F5 (up fourth)"
        ],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "4 crotchets, 2 quavers",
        "rhythmSequence": [
          "crotchet",
          "quaver",
          "quaver",
          "crotchet",
          "crotchet",
          "crotchet"
        ]
      },
      "contextDiagnostics": {
        "status": "not yet mapped",
        "preContextNotes": [],
        "postContextNotes": []
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "fourth/larger leaps",
        "rhythm:crotchet",
        "rhythm:quaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "notes": "Question 12 uses six draggable notes. Pitch sequence provided by user: D5, C5, F5, D5, B4, C5. Rhythms are crotchet, quaver, quaver, crotchet, crotchet, crotchet. X positions were taken from the visual centres of the six missing noteheads in the answer PNG.",
    "composer": "Composer to confirm",
    "work": "MM012 source to confirm",
    "movement": "Extract 12",
    "source": "MM012 source to confirm",
    "rights": "Prototype",
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM008",
    "file": "questions/mm008/MM008-audio.mp3",
    "questionImage": "questions/mm008/mm008-question.png",
    "answerImage": "questions/mm008/mm008-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "F5",
      "G5",
      "F5",
      "G5",
      "B5",
      "G5"
    ],
    "noteImage": "assets/icons/notes/semiquaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/semiquaver-sibelis.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "4 semiquavers, 2 quavers",
      "staffPitches": [
        "C6",
        "B5",
        "A5",
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 48.62,
          "pitch": "F5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 51.47,
          "pitch": "G5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 54.24,
          "pitch": "F5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 56.87,
          "pitch": "G5",
          "icon": "assets/icons/notes/semiquaver-sibelius.png",
          "rhythm": "semiquaver"
        },
        {
          "x": 60.92,
          "pitch": "B5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 64.45,
          "pitch": "G5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "F5",
          "G5",
          "F5",
          "G5",
          "B5",
          "G5"
        ],
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          48.62,
          51.47,
          54.24,
          56.87,
          60.92,
          64.45
        ],
        "range": "F5-B5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "F5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 48.62,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "G5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 51.47,
          "register": "just above stave",
          "aboveStave": true,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "F5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 54.24,
          "register": "top of stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "G5",
          "rhythm": "semiquaver",
          "icon": "semiquaver-sibelius.png",
          "x": 56.87,
          "register": "just above stave",
          "aboveStave": true,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "B5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 60.92,
          "register": "ledger-line area above stave",
          "aboveStave": true,
          "ledgerLine": true
        },
        {
          "slot": 6,
          "pitch": "G5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 64.45,
          "register": "just above stave",
          "aboveStave": true,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up step",
          "down step",
          "up step",
          "up third",
          "down third"
        ],
        "intervalProfile": [
          "step",
          "step",
          "step",
          "third",
          "third"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [
          "1-2: F5→G5 (up step)",
          "2-3: G5→F5 (down step)",
          "3-4: F5→G5 (up step)"
        ],
        "thirds": [
          "4-5: G5→B5 (up third)",
          "5-6: B5→G5 (down third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": true,
        "ledgerLineFocus": [
          "B5 above first ledger line"
        ]
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "4 semiquavers, 2 quavers",
        "rhythmSequence": [
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "semiquaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "mapped from visible score context",
        "preContextNotes": [
          {
            "pitch": "F5",
            "rhythm": "quaver",
            "relationToFirstAnswer": "same note"
          }
        ],
        "postContextNotes": [
          {
            "pitch": "A5",
            "rhythm": "quaver",
            "relationToLastAnswer": "up step"
          }
        ]
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "stepwise motion",
        "thirds",
        "above stave",
        "ledger lines",
        "rhythm:quaver",
        "rhythm:semiquaver"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "notes": "Question 8 uses six draggable notes. Pitch sequence provided by user: F5, G5, F5, G5, B5, G5. Rhythms inferred from the answer PNG are four semiquavers followed by two quavers. X positions were taken from the visual centres of the six missing noteheads in the answer PNG.",
    "composer": "Composer to confirm",
    "work": "MM008 source to confirm",
    "movement": "Extract 8",
    "source": "MM008 source to confirm",
    "rights": "Prototype",
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  },
  {
    "id": "MM014",
    "file": "questions/mm014/MM014-audio.mp3",
    "questionImage": "questions/mm014/mm014-question.png",
    "answerImage": "questions/mm014/mm014-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "G5",
      "E5",
      "C5",
      "G4",
      "E5",
      "C5"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 quavers",
      "staffPitches": [
        "A5",
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 60.88,
          "pitch": "G5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 66.33,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 71.81,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 78.49,
          "pitch": "G4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 84.13,
          "pitch": "E5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 89.6,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 14 uses six draggable notes from the missing section of the PNG. The printed preceding high A5 and following low G4 are mapped as context notes only. All draggable rhythms are quavers. User supplied the pitch text “g e g c (low)g e c”; the PNG itself shows six missing noteheads before the printed following low G, so this build treats the draggable answer as G5, E5, C5, G4, E5, C5.",
    "composer": "Composer to confirm",
    "work": "MM014 source to confirm",
    "movement": "Extract 14",
    "source": "MM014 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "G5",
          "E5",
          "C5",
          "G4",
          "E5",
          "C5"
        ],
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          60.88,
          66.33,
          71.81,
          78.49,
          84.13,
          89.6
        ],
        "range": "G4-G5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "G5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 60.88,
          "register": "above stave",
          "aboveStave": true,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 66.33,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 71.81,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "G4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 78.49,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "E5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 84.13,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 89.6,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "down third",
          "down third",
          "down fourth",
          "up sixth",
          "down third"
        ],
        "intervalProfile": [
          "third",
          "third",
          "fourth/larger leap",
          "fourth/larger leap",
          "third"
        ],
        "repeatedNotes": [],
        "stepwiseMotion": [],
        "thirds": [
          "1-2: G5→E5 (down third)",
          "2-3: E5→C5 (down third)",
          "5-6: E5→C5 (down third)"
        ],
        "fourthsOrLargerLeaps": [
          "3-4: C5→G4 (down fourth)",
          "4-5: G4→E5 (up sixth)"
        ],
        "aboveStave": true,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "6 quavers",
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "mapped from supplied score context",
        "preContextNotes": [
          {
            "pitch": "A5",
            "rhythm": "quaver",
            "x": 55.42,
            "relationToFirstAnswer": "down step to G5"
          }
        ],
        "postContextNotes": [
          {
            "pitch": "G4",
            "rhythm": "quaver",
            "x": 95.2,
            "relationToLastAnswer": "down fourth from C5"
          }
        ]
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "thirds",
        "fourths-or-larger leaps",
        "above-stave note",
        "broken-chord pattern",
        "rhythm:quaver",
        "context:preceding-note",
        "context:following-note"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 5,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 5s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 5,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 5s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM015",
    "file": "questions/mm015/MM015-audio.mp3",
    "questionImage": "questions/mm015/mm015-question.png",
    "answerImage": "questions/mm015/mm015-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "B4",
      "D5",
      "C5",
      "C5",
      "D5",
      "F5"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "6 quavers",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4"
      ],
      "slots": [
        {
          "x": 42.93,
          "pitch": "B4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 48.41,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 55.39,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 60.87,
          "pitch": "C5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 66.19,
          "pitch": "D5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        },
        {
          "x": 71.67,
          "pitch": "F5",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver"
        }
      ]
    },
    "notes": "Question 15 uses six draggable notes. Pitch sequence provided by user: B4, D5, C5, C5, D5, F5. All six rhythms are quavers. X positions were taken from the visual centres of the six missing noteheads in the answer PNG.",
    "composer": "Composer to confirm",
    "work": "MM015 source to confirm",
    "movement": "Extract 15",
    "source": "MM015 source to confirm",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "B4",
          "D5",
          "C5",
          "C5",
          "D5",
          "F5"
        ],
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          42.93,
          48.41,
          55.39,
          60.87,
          66.19,
          71.67
        ],
        "range": "B4-F5"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "B4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 42.93,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 48.41,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 55.39,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "C5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 60.87,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "D5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 66.19,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "F5",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 71.67,
          "register": "upper-middle stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "up third",
          "down step",
          "same",
          "up step",
          "up third"
        ],
        "intervalProfile": [
          "third",
          "step",
          "repeated note",
          "step",
          "third"
        ],
        "repeatedNotes": [
          "3-4: C5→C5 (same)"
        ],
        "stepwiseMotion": [
          "2-3: D5→C5 (down step)",
          "4-5: C5→D5 (up step)"
        ],
        "thirds": [
          "1-2: B4→D5 (up third)",
          "5-6: D5→F5 (up third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "6 quavers",
        "rhythmSequence": [
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "mapped from supplied score context",
        "preContextNotes": [
          {
            "pitch": "A4",
            "rhythm": "quaver",
            "x": 37.45,
            "relationToFirstAnswer": "up step to B4"
          }
        ],
        "postContextNotes": [
          {
            "pitch": "Eb5",
            "rhythm": "quaver",
            "x": 77.99,
            "relationToLastAnswer": "down step from F5"
          }
        ]
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "repeated notes",
        "stepwise motion",
        "thirds",
        "rhythm:quaver",
        "context:preceding-note",
        "context:following-note"
      ],
      "guidedPlayback": {
        "scoreCoverage": "partial-audio",
        "useFullAudioDuration": false,
        "visualStartSeconds": 0,
        "visualEndSeconds": 4,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "Guided Teacher Mode scroll should complete at 4s because the score PNG excerpt ends there.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "partial-audio",
      "useFullAudioDuration": false,
      "visualStartSeconds": 0,
      "visualEndSeconds": 4,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "Guided Teacher Mode scroll should complete at 4s because the score PNG excerpt ends there."
    }
  },
  {
    "id": "MM013",
    "file": "questions/mm013/MM013-audio.mp3",
    "questionImage": "questions/mm013/mm013-question.png",
    "answerImage": "questions/mm013/mm013-answer.png",
    "mode": "dictation",
    "difficulty": "easy",
    "skill": "Melodic Dictation",
    "question": "Complete the melody.",
    "answerPitches": [
      "G4",
      "G4",
      "E4",
      "F4",
      "F4",
      "D4"
    ],
    "noteImage": "assets/icons/notes/quaver-sibelius.png",
    "noteImageFallback": "assets/icons/notes/quaver-sibelius.png",
    "dictationLayout": {
      "topLinePitch": "F5",
      "staffTopY": 30.05,
      "staffStepY": 5.05,
      "homeY": 2,
      "snapToleranceY": 10,
      "noteWidthPercent": 3.95,
      "noteHeightPercent": 47,
      "noteStretchX": 1.95,
      "noteCountLabel": "2 quavers, 1 crotchet, 3 quavers",
      "staffPitches": [
        "G5",
        "F5",
        "E5",
        "D5",
        "C5",
        "B4",
        "A4",
        "G4",
        "F4",
        "E4",
        "D4",
        "C4",
        "B3"
      ],
      "slots": [
        {
          "x": 35.6,
          "pitch": "G4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver",
          "visualAnchorY": 90.3
        },
        {
          "x": 41.35,
          "pitch": "G4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver",
          "visualAnchorY": 90.3
        },
        {
          "x": 47.1,
          "pitch": "E4",
          "icon": "assets/icons/notes/crotchet-sibelius.png",
          "rhythm": "crotchet",
          "visualAnchorY": 90.45
        },
        {
          "x": 56.45,
          "pitch": "F4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver",
          "visualAnchorY": 90.3
        },
        {
          "x": 62.22,
          "pitch": "F4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver",
          "visualAnchorY": 90.3
        },
        {
          "x": 67.98,
          "pitch": "D4",
          "icon": "assets/icons/notes/quaver-sibelius.png",
          "rhythm": "quaver",
          "visualAnchorY": 90.3
        }
      ]
    },
    "notes": "Question 13 uses six draggable notes. Pitch sequence provided by user: G4, G4, E4, F4, F4, D4. Rhythms are quaver, quaver, crotchet, quaver, quaver, quaver. X positions were recalibrated from the visual centres of the six missing noteheads in the answer PNG. Per-note visualAnchorY values correct the one-staff-step-low display issue without changing the musical answer pitches.",
    "composer": "Haydn",
    "work": "Symphony no. 94 in G major 'Surprise', H. I:94",
    "movement": "II",
    "source": "Musopen / European Archive",
    "rights": "Prototype",
    "hiddenMetadata": {
      "schemaVersion": "MM-diagnostic-metadata-v1",
      "answerSummary": {
        "noteCount": 6,
        "pitchSequence": [
          "G4",
          "G4",
          "E4",
          "F4",
          "F4",
          "D4"
        ],
        "rhythmSequence": [
          "quaver",
          "quaver",
          "crotchet",
          "quaver",
          "quaver",
          "quaver"
        ],
        "xPositions": [
          35.6,
          41.35,
          47.1,
          56.45,
          62.22,
          67.98
        ],
        "range": "D4-G4"
      },
      "answerSlots": [
        {
          "slot": 1,
          "pitch": "G4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 35.6,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 2,
          "pitch": "G4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 41.35,
          "register": "middle/lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 3,
          "pitch": "E4",
          "rhythm": "crotchet",
          "icon": "crotchet-sibelius.png",
          "x": 47.1,
          "register": "lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 4,
          "pitch": "F4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 56.45,
          "register": "lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 5,
          "pitch": "F4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 62.22,
          "register": "lower stave",
          "aboveStave": false,
          "ledgerLine": false
        },
        {
          "slot": 6,
          "pitch": "D4",
          "rhythm": "quaver",
          "icon": "quaver-sibelius.png",
          "x": 67.98,
          "register": "lower stave",
          "aboveStave": false,
          "ledgerLine": false
        }
      ],
      "melodicDiagnostics": {
        "contour": [
          "same",
          "down third",
          "up step",
          "same",
          "down third"
        ],
        "intervalProfile": [
          "repeated note",
          "third",
          "step",
          "repeated note",
          "third"
        ],
        "repeatedNotes": [
          "1-2: G4→G4 (same)",
          "4-5: F4→F4 (same)"
        ],
        "stepwiseMotion": [
          "3-4: E4→F4 (up step)"
        ],
        "thirds": [
          "2-3: G4→E4 (down third)",
          "5-6: F4→D4 (down third)"
        ],
        "fourthsOrLargerLeaps": [],
        "aboveStave": false,
        "ledgerLineFocus": []
      },
      "rhythmicDiagnostics": {
        "rhythmFocus": "2 quavers, 1 crotchet, 3 quavers",
        "rhythmSequence": [
          "quaver",
          "quaver",
          "crotchet",
          "quaver",
          "quaver",
          "quaver"
        ]
      },
      "contextDiagnostics": {
        "status": "mapped from supplied score context",
        "preContextNotes": [
          {
            "pitch": "E4",
            "rhythm": "quaver",
            "x": 29.92,
            "relationToFirstAnswer": "up third to G4"
          }
        ],
        "postContextNotes": [
          {
            "pitch": "B3",
            "rhythm": "crotchet",
            "x": 94.43,
            "relationToLastAnswer": "down third from D4"
          }
        ]
      },
      "calibrationDiagnostics": {
        "visualAnchorYFixes": [
          "MM013 slots visually sat one staff-step too low; per-note visualAnchorY increased by about 10.75 token-percentage points.",
          "Slots 1,2,4,5,6 quaver visualAnchorY=90.30",
          "Slot 3 crotchet visualAnchorY=90.45"
        ],
        "acceptedPitchOverrides": []
      },
      "diagnosticTags": [
        "repeated notes",
        "stepwise motion",
        "thirds",
        "rhythm:crotchet",
        "rhythm:quaver",
        "context:preceding-note",
        "context:following-note"
      ],
      "guidedPlayback": {
        "scoreCoverage": "full-audio",
        "useFullAudioDuration": true,
        "visualStartSeconds": 0,
        "visualEndSeconds": null,
        "visibleScoreRatio": 0.44,
        "leadInSeconds": 2,
        "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback.",
        "source": "User supplied on 2026-07-03"
      }
    },
    "guidedPlayback": {
      "scoreCoverage": "full-audio",
      "useFullAudioDuration": true,
      "visualStartSeconds": 0,
      "visualEndSeconds": null,
      "visibleScoreRatio": 0.44,
      "leadInSeconds": 2,
      "notes": "E = score PNG covers the full audio clip for guided Teacher Mode playback."
    }
  }
];
