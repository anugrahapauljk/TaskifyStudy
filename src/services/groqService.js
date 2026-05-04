import { GROQ_API_URL, API_KEY, MODEL } from "./config";

/**
 * Sanitize and parse JSON from LLM response.
 * Handles common issues: markdown fences, trailing commas, unescaped chars.
 */
function parseJSONSafe(raw) {
  let text = raw.trim();

  // Remove markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, "$1");

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to fix common escaping issues in string values
    // Replace unescaped newlines inside strings
    text = text.replace(/(?<=:\s*")((?:[^"\\]|\\.)*)(?=")/g, (match) => {
      return match
        .replace(/(?<!\\)\n/g, "\\n")
        .replace(/(?<!\\)\r/g, "\\r")
        .replace(/(?<!\\)\t/g, "\\t");
    });

    try {
      return JSON.parse(text);
    } catch (e2) {
      throw new Error(`Failed to parse JSON response: ${e2.message}\nRaw: ${raw.slice(0, 500)}`);
    }
  }
}

async function callGroq(messages, temperature = 0.7, maxTokens = 4096) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Condense raw extracted text to only main topics and definitions.
 * Ignores examples, code, and repetition. Keeps output under 200 words.
 */
export async function condenseText(rawText) {
  const truncated = rawText.slice(0, 4000);

  const escapedText = truncated
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ");

  const messages = [
    {
      role: "system",
      content: `You are a text summarizer for study materials. Extract ONLY the main topics and their key definitions from the given text.

Rules:
- Extract ONLY main topics and definitions
- Ignore examples, code snippets, and repetitive content
- Keep the total output under 200 words
- Use clear, concise language
- Preserve technical terms and key concepts accurately

You MUST return a valid JSON object:
{
  "condensed": "The condensed text with only main topics and definitions, under 200 words"
}`,
    },
    {
      role: "user",
      content: `Extract only the main topics and definitions from this text. Ignore examples, code, and repetition. Keep output under 200 words:\n\n${escapedText}`,
    },
  ];

  const result = await callGroq(messages, 0.2, 512);
  const parsed = parseJSONSafe(result);
  return parsed.condensed || rawText.slice(0, 2000);
}

export async function organizeTopics(condensedText) {
  // Pre-escape the input text to avoid breaking JSON
  const escapedText = condensedText
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ");

  const messages = [
    {
      role: "system",
      content: `You are a study material organizer. Given condensed study material (main topics and definitions only), organize it into distinct topic-wise sections.

You MUST return a valid JSON object. Ensure all string values are properly escaped:
- Use \\n for newlines within strings
- Use \\" for quotes within strings  
- Do NOT use unescaped special characters in string values

Return this exact JSON structure:
{
  "topics": [
    {
      "title": "Topic Title",
      "content": "Key definitions and concepts for this topic. Use plain text only."
    }
  ]
}

Rules:
- Create between 2 and 10 topics depending on the material
- Each topic should be a coherent, self-contained section
- Topic titles should be clear and descriptive
- Focus on definitions, key concepts, and core ideas
- All string values must be valid JSON strings with proper escaping`,
    },
    {
      role: "user",
      content: `Organize this condensed study material into topics:\n\n${escapedText}`,
    },
  ];

  const result = await callGroq(messages, 0.3, 1024);
  const parsed = parseJSONSafe(result);
  return parsed.topics || [];
}

export async function generateQuiz(topicTitle, topicContent, questionCount) {
  const count = Math.min(Math.max(questionCount, 1), 50);

  const safeTitle = topicTitle.replace(/"/g, '\\"');
  const safeContent = topicContent
    .slice(0, 8000)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, "");

  const messages = [
    {
      role: "system",
      content: `You are a quiz generator for educational assessment. Generate multiple-choice questions that test understanding of the given topic material. Questions should range from basic recall to deeper comprehension.

You MUST return a valid JSON object with all string values properly escaped.

Return this exact JSON structure:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- Generate exactly ${count} questions
- correctAnswer is the 0-based index of the correct option
- Each question must have exactly 4 options
- Questions should test genuine understanding, not just memorization
- Explanations should be concise but helpful
- All string values must be valid JSON strings — escape quotes and special characters`,
    },
    {
      role: "user",
      content: `Generate ${count} quiz questions for the topic "${safeTitle}":\n\n${safeContent}`,
    },
  ];

  const result = await callGroq(messages, 0.5, 2048);
  const parsed = parseJSONSafe(result);
  return parsed.questions || [];
}

export async function evaluateTopic(topicTitle, score, total, answers) {
  const percentage = Math.round((score / total) * 100);
  const wrongAnswers = answers
    .filter((a) => !a.isCorrect)
    .map((a) => `Q: ${a.question} — Student chose: "${a.selected}" — Correct: "${a.correct}"`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content: `You are an educational evaluator. Analyze the student's quiz performance and provide feedback.

You MUST return a valid JSON object with all string values properly escaped.

Return this exact JSON structure:
{
  "understanding": "strong" | "can_improve" | "weak",
  "feedback": "Detailed feedback paragraph about the student's understanding",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area to improve 1", "Area to improve 2"]
}

All string values must be valid JSON strings.`,
    },
    {
      role: "user",
      content: `Topic: "${topicTitle}"
Score: ${score}/${total} (${percentage}%)
${wrongAnswers ? `\nIncorrect answers:\n${wrongAnswers}` : "All answers were correct!"}`,
    },
  ];

  const result = await callGroq(messages, 0.4, 512);
  try {
    return parseJSONSafe(result);
  } catch {
    return {
      understanding: percentage >= 70 ? "strong" : percentage >= 40 ? "can_improve" : "weak",
      feedback: `You scored ${score}/${total}. ${percentage >= 70 ? "Great work!" : "Keep studying this topic."}`,
      strengths: [],
      improvements: [],
    };
  }
}

export async function generateFinalEvaluation(results) {
  const summary = results.map((r) => ({
    topic: r.topicTitle,
    score: `${r.quizScore}/${r.totalQuestions}`,
    timeUsed: r.timeTaken,
    timeAllotted: r.timeAllotted,
    understanding: r.understanding,
  }));

  const messages = [
    {
      role: "system",
      content: `You are an educational evaluator providing a final assessment. Analyze the student's overall performance across all topics.

You MUST return a valid JSON object with all string values properly escaped.

Return this exact JSON structure:
{
  "overallUnderstanding": "strong" | "can_improve" | "weak",
  "overallFeedback": "Comprehensive feedback paragraph",
  "studyRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "topicInsights": [
    {
      "topic": "Topic name",
      "verdict": "Brief one-line insight"
    }
  ]
}

All string values must be valid JSON strings.`,
    },
    {
      role: "user",
      content: `Final evaluation for student:\n${JSON.stringify(summary, null, 2)}`,
    },
  ];

  const result = await callGroq(messages, 0.4, 1024);
  try {
    return parseJSONSafe(result);
  } catch {
    return {
      overallUnderstanding: "can_improve",
      overallFeedback: "Review completed. Check individual topic results for details.",
      studyRecommendations: [],
      topicInsights: [],
    };
  }
}
