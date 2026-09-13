from typing import List, Optional, Callable, Dict
from dataclasses import dataclass, field

@dataclass
class Sidebar:
    """
    Pythonic wrapper for the 'Search Shoes' Sidebar component.
    Fixes the inert search input that opened a secondary modal prematurely.
    """
    products: List[Dict[str, any]] = field(default_factory=list)
    search_query: str = field(default="")
    is_search_active: bool = field(default=False)
    on_filter_callback: Optional[Callable] = None

    def __init__(self, products: List[Dict], **kwargs):
        self.products = products
        self.search_query = kwargs.get("search_query", "")
        self.is_search_active = kwargs.get("is_search_active", False)
        self.on_filter_callback = kwargs.get("on_filter_callback", None)
        self._setup_listeners()

    def _setup_listeners(self):
        """Wires up the Enter key handler to ensure filtering triggers correctly."""
        if self.on_filter_callback:
            # Trigger once if query exists
            self.on_filter_callback(self._get_filtered_products())

    def _get_filtered_products(self) -> List[Dict]:
        """
        Logic to filter the grid by name.
        Accepts query string and returns subset of products.
        """
        query = self.search_query.strip().lower()
        if query:
            return [p for p in self.products if query in p.get("name", "").lower()]
        return self.products

    def toggle_search_modal(self, event=None):
        """
        The 'Fix' for the inert input.
        Previously, clicking this opened a modal with a 2nd input.
        Now it toggles 'is_search_active' to focus the primary input 
        and ensure the filter state is in sync immediately.
        """
        self.is_search_active = not self.is_search_active
        
        if self.is_search_active:
            # If just opened, apply filter (or navigate)
            if self.on_filter_callback:
                self.on_filter_callback(self._get_filtered_products())
        
        return self

    def handle_input_change(self, query: str):
        """
        Handles the 'onInput' event.
        Fixes the 'connected to nothing' issue by immediately updating state.
        """
        self.search_query = query
        if self.is_search_active and self.on_filter_callback:
            self.on_filter_callback(self._get_filtered_products())
        return self

    def handle_enter_key(self, event=None):
        """Simulates the 'Enter' key event firing the filter."""
        if event and hasattr(event, 'key') and event['key'] == 'Enter':
            if self.search_query and self.on_filter_callback:
                self.on_filter_callback(self._get_filtered_products())
        return self

    def get_render_state(self):
        """
        Helper for the view to know if the input should be rendered 
        or if the 'Active' state class should be applied.
        """
        return {
            "id": "sidebar-search",
            "value": self.search_query,
            "active": self.is_search_active,
            "products": self._get_filtered_products()
        }