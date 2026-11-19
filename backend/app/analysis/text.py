"""Pure text helpers that keep long inputs inside the model's budget."""

GAP_MARKER = "[…]"


def normalise_whitespace(text: str) -> str:
    return " ".join((text or "").split())


def word_count(text: str) -> int:
    return len((text or "").split())


def truncate_words_head_tail(text: str, max_words: int) -> str:
    """Keep the opening and the ending: the headline claim and the conclusion matter most."""
    words = (text or "").split()
    if len(words) <= max_words:
        return " ".join(words)
    head_size = (max_words * 2) // 3
    tail_size = max_words - head_size
    return " ".join([*words[:head_size], GAP_MARKER, *words[-tail_size:]])


def sample_head_middle_tail(text: str, max_chars: int) -> str:
    """Three evenly sized slices so a long transcript is judged on its whole arc."""
    text = normalise_whitespace(text)
    if len(text) <= max_chars:
        return text
    separator = f" {GAP_MARKER} "
    slice_size = (max_chars - 2 * len(separator)) // 3
    middle_start = (len(text) - slice_size) // 2
    slices = [
        _cut_at_words(text, 0, slice_size),
        _cut_at_words(text, middle_start, middle_start + slice_size),
        _cut_at_words(text, len(text) - slice_size, len(text)),
    ]
    return separator.join(slices)


def _cut_at_words(text: str, start: int, end: int) -> str:
    """Slice text[start:end] without leaving half words at either edge."""
    piece = text[start:end]
    if start > 0 and not text[start - 1].isspace():
        piece = piece.split(" ", 1)[-1]
    if end < len(text) and not text[end].isspace():
        piece = piece.rsplit(" ", 1)[0]
    return piece.strip()
