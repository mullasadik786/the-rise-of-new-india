import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s*prompt/i,
  /reveal\s+(your\s+)?(api\s*key|secret|env|credentials)/i,
  /execute\s+shell|run\s+command/i,
  /bypass\s+(security|auth|rbac)/i,
];

export function sanitizeUserPrompt(input: string): { safe: boolean; cleaned: string; reason?: string } {
  const trimmed = input.trim().slice(0, 4000);
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        cleaned: '',
        reason: 'Request blocked by AI safety filter: disallowed instruction pattern detected.',
      };
    }
  }
  return { safe: true, cleaned: trimmed };
}

export interface AiResponsePayload {
  answer: string;
  disclaimer: string;
  isAiGenerated: true;
  language: string;
  actionItems: string[];
  requiresHumanConfirmation: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  te: 'Telugu',
};

export async function generateRegionalAssistantReply(params: {
  message: string;
  sector: string;
  regionName: string;
  language: string;
  userRole: string;
  contextSummary?: string;
}): Promise<AiResponsePayload> {
  const check = sanitizeUserPrompt(params.message);
  if (!check.safe) {
    throw new Error(check.reason || 'Unsafe prompt detected.');
  }

  const targetLanguage = LANGUAGE_LABELS[params.language] || 'English';

  const systemInstruction = `You are the AI Regional Assistant for "The Rise of New India", currently focused on ${params.regionName} and designed to scale across Bharat.
Current sector context: ${params.sector}.
Caller role: ${params.userRole}.
Respond strictly in ${targetLanguage}.
Safety and Accuracy Rules:
1. NEVER fabricate official government schemes, subsidies, MSP prices, regulatory notifications, or real-world statistics. When discussing schemes or prices, advise verifying with the official state portal (e.g., MP Krishi, Udyam Registration, Skill India Digital, IMC Indore) unless verified context is explicitly provided below.
2. NEVER ask for or repeat Aadhaar numbers, bank details, passwords, or private PII.
3. Keep recommendations practical, actionable, concise, and tailored to Indian regional conditions.
4. Clearly separate AI recommendations from official department decisions.
${params.contextSummary ? `Verified regional context:\n${params.contextSummary}` : ''}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: check.cleaned,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: {
            type: Type.STRING,
            description: 'Clear, helpful response in the requested language.',
          },
          actionItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 concrete next steps for the user.',
          },
          requiresHumanConfirmation: {
            type: Type.BOOLEAN,
            description: 'True if the suggestion involves financial, medical/chemical pesticide, or official filing decisions requiring human review.',
          },
        },
        required: ['answer', 'actionItems', 'requiresHumanConfirmation'],
      },
    },
  });

  const rawText = (response.text || '{}').trim();
  const parsed = JSON.parse(rawText) as {
    answer?: string;
    actionItems?: string[];
    requiresHumanConfirmation?: boolean;
  };

  return {
    answer: parsed.answer || 'No response generated.',
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    requiresHumanConfirmation: Boolean(parsed.requiresHumanConfirmation),
    isAiGenerated: true,
    language: params.language,
    disclaimer:
      params.language === 'hi'
        ? 'AI द्वारा जनित सुझाव — आधिकारिक सरकारी सलाह या कृषि विशेषज्ञ सत्यापन का विकल्प नहीं।'
        : params.language === 'te'
          ? 'AI రూపొందించిన సూచన — అధికారిక ప్రభుత్వ సలహాకు ప్రత్యామ్నాయం కాదు.'
          : 'AI-Generated Advisory — Verify official schemes, MSP rates, and chemical dosages with authorized regional departments before acting.',
  };
}

export async function analyzeCropImageWithGemini(params: {
  base64Data: string;
  mimeType: string;
  cropName: string;
  regionName: string;
  language: string;
}) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(params.mimeType)) {
    throw new Error('Unsupported image format. Only JPEG, PNG, and WebP are permitted.');
  }

  const targetLanguage = LANGUAGE_LABELS[params.language] || 'English';

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.base64Data,
          },
        },
        {
          text: `Analyze this crop leaf/plant photograph for ${params.cropName || 'regional crop'} in ${params.regionName}. Respond in ${targetLanguage}. Identify visible stress, possible fungal/pest symptoms, confidence level (Low/Medium/High), and safe integrated pest management (IPM) steps. Emphasize consulting a local Krishi Vigyan Kendra (KVK) agronomist before applying chemical pesticides.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          observedSymptoms: { type: Type.STRING },
          likelyCondition: { type: Type.STRING },
          confidenceLevel: { type: Type.STRING },
          organicAndIpmSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          safetyWarning: { type: Type.STRING },
        },
        required: [
          'observedSymptoms',
          'likelyCondition',
          'confidenceLevel',
          'organicAndIpmSteps',
          'safetyWarning',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim());
  return {
    ...parsed,
    isAiGenerated: true,
    disclaimer: 'AI Visual Screening Only — Confirm diagnosis with your nearest Krishi Vigyan Kendra (KVK) officer before chemical treatment.',
  };
}

export async function generateMsmeContentWithGemini(params: {
  businessName: string;
  category: string;
  productName: string;
  goal: 'product_description' | 'marketing_post' | 'financial_plan';
  language: string;
  details: string;
}) {
  const check = sanitizeUserPrompt(`${params.businessName} ${params.productName} ${params.details}`);
  if (!check.safe) {
    throw new Error(check.reason || 'Disallowed input.');
  }

  const targetLanguage = LANGUAGE_LABELS[params.language] || 'English';
  const prompt = `Create ${params.goal.replace('_', ' ')} content in ${targetLanguage} for an Indian MSME named "${params.businessName}" (category: ${params.category}), product/focus: "${params.productName}". Additional details: ${check.cleaned}. Do NOT claim government certification or official Udyam verification.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          content: { type: Type.STRING },
          tips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['headline', 'content', 'tips'],
      },
    },
  });

  return {
    ...JSON.parse((response.text || '{}').trim()),
    isAiGenerated: true,
    disclaimer: 'AI-Generated Business Draft — Review pricing, GST compliance, and claims before publishing.',
  };
}
