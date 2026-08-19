import type { CanonicalMessage, CanonicalSuggestion } from '../runtime-types'

function toSuggestion(suggestion: CanonicalSuggestion): Record<string, unknown> {
  if (suggestion.kind === 'reply') {
    return {
      reply: {
        text: suggestion.label,
        postbackData: suggestion.postbackData,
      },
    }
  }

  if (suggestion.kind === 'open_url') {
    return {
      action: {
        text: suggestion.label,
        postbackData: suggestion.postbackData,
        openUrlAction: { url: suggestion.url },
      },
    }
  }

  return {
    action: {
      text: suggestion.label,
      postbackData: suggestion.postbackData,
      dialAction: { phoneNumber: suggestion.phoneNumber },
    },
  }
}

/**
 * Google wire-format boundary. Nothing outside this module should know the shape
 * of AgentMessage / AgentContentMessage.
 */
export function toGoogleAgentMessage(message: CanonicalMessage): Record<string, unknown> {
  if (message.kind === 'text') {
    return {
      contentMessage: {
        text: message.text,
        ...(message.suggestions?.length
          ? { suggestions: message.suggestions.map(toSuggestion) }
          : {}),
      },
    }
  }

  const cardContent: Record<string, unknown> = {
    title: message.title,
    ...(message.description ? { description: message.description } : {}),
    ...(message.cardSuggestions?.length
      ? { suggestions: message.cardSuggestions.map(toSuggestion) }
      : {}),
  }

  if (message.mediaUrl) {
    cardContent.media = {
      height: 'MEDIUM',
      contentInfo: {
        fileUrl: message.mediaUrl,
        forceRefresh: false,
        ...(message.mediaAltText ? { altText: message.mediaAltText } : {}),
      },
    }
  }

  return {
    contentMessage: {
      richCard: {
        standaloneCard: { cardContent },
      },
      ...(message.suggestions?.length
        ? { suggestions: message.suggestions.map(toSuggestion) }
        : {}),
    },
  }
}
