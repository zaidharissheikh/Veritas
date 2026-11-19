from app.analysis.cache import TtlCache, make_key


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_get_returns_stored_value_until_ttl_expires():
    clock = FakeClock()
    cache = TtlCache(ttl_seconds=60, clock=clock)
    cache.set("k", {"score": 1})

    clock.now += 59
    assert cache.get("k") == {"score": 1}
    clock.now += 1
    assert cache.get("k") is None
    assert len(cache) == 0


def test_oldest_entry_is_evicted_when_full():
    cache = TtlCache(max_entries=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")  # touching "a" makes "b" the least recently used
    cache.set("c", 3)

    assert cache.get("b") is None
    assert cache.get("a") == 1
    assert cache.get("c") == 3


def test_cached_values_cannot_be_mutated_by_callers():
    cache = TtlCache()
    value = {"highlights": []}
    cache.set("k", value)
    value["highlights"].append("changed")
    cache.get("k")["highlights"].append("changed again")

    assert cache.get("k") == {"highlights": []}


def test_make_key_ignores_spacing_but_not_content():
    assert make_key("article", "Big  news\n") == make_key("article", "Big news")
    assert make_key("article", "Big news") != make_key("article", "Small news")
    assert make_key("a", "bc") != make_key("ab", "c")
    assert len(make_key("x")) == 64
