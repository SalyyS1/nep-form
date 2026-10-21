// Provider responses and exception messages can contain addresses or credentials; retain only a bounded status.
export function resendTransport(apiKey, fetcher = fetch) {
  return async (payload, idempotencyKey) => {
    let response;
    try {
      response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      });
    } catch { throw Object.assign(new Error('Email transport unavailable.'), { mailCode: 'TRANSPORT_UNAVAILABLE', retryable: true }); }
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error('Email provider rejected request.'), {
        mailCode: `HTTP_${response.status}`, retryable: [408, 409, 425, 429].includes(response.status) || response.status >= 500,
      });
    }
    // Acceptance means queued by Resend, never proof that the recipient received the email.
    await response.body?.cancel();
    return { accepted: true };
  };
}
