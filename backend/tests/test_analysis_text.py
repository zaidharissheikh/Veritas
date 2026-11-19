from app.analysis.text import GAP_MARKER, sample_head_middle_tail, truncate_words_head_tail


def test_short_text_is_unchanged():
    assert truncate_words_head_tail("one  two three", 10) == "one two three"
    assert sample_head_middle_tail("short transcript", 100) == "short transcript"


def test_truncate_keeps_head_and_tail():
    text = " ".join(f"w{i}" for i in range(100))
    truncated = truncate_words_head_tail(text, 30).split()

    assert truncated[:20] == [f"w{i}" for i in range(20)]
    assert truncated[20] == GAP_MARKER
    assert truncated[21:] == [f"w{i}" for i in range(90, 100)]


def test_sample_takes_head_middle_and_tail_within_budget():
    text = " ".join(f"word{i:04d}" for i in range(3000))
    sample = sample_head_middle_tail(text, 1200)
    head, middle, tail = sample.split(f" {GAP_MARKER} ")

    assert len(sample) <= 1200
    assert head.startswith("word0000")
    assert tail.endswith("word2999")
    assert "word1500" in middle or "word1499" in middle
    # No half words at the slice edges.
    for piece in (head, middle, tail):
        assert all(len(word) == 8 for word in piece.split())
