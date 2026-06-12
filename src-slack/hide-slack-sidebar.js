const HSS = {
  state: {},
  closeTimeout: null,
  openLock: false,
  documentListenersAttached: false,
  boundCheckFullscreen: null,
  closePending: false,
  CLOSE_DELAY: 250,
  OPEN_LOCK_DURATION: 500,
  KEEP_ALIVE_PADDING: 60,

  getTabRail() {
    return document.querySelector('.p-tab_rail')
      || document.querySelector('[class*="tab_rail"]');
  },

  getSidebarContainer() {
    return document.querySelector('.p-view_contents--sidebar')
      || document.querySelector('[class*="p-view_contents"][class*="sidebar"]');
  },

  getWorkspaceWrapper() {
    return document.querySelector('.p-client_workspace_wrapper');
  },

  getTabpanel() {
    return document.querySelector('.p-client_workspace__tabpanel');
  },

  isSidebarElement(el) {
    if (!el) return false;
    return !!(
      el.closest('.hss-tab-rail')
      || el.closest('.hss-sidebar-container')
      || el.closest('.p-tab_rail')
      || el.closest('.p-view_contents--sidebar')
      || el.closest('.p-ia4_channel_list')
      || el.closest('.p-channel_sidebar')
      || el.closest('.p-control_strip')
    );
  },

  tagElements() {
    const tabRail = this.getTabRail();
    if (tabRail && !tabRail.classList.contains('hss-tab-rail')) {
      tabRail.classList.add('hss-tab-rail');
    }

    const sidebarContainer = this.getSidebarContainer();
    if (sidebarContainer && !sidebarContainer.classList.contains('hss-sidebar-container')) {
      sidebarContainer.classList.add('hss-sidebar-container');
    }
  },

  getSheet() {
    let sheet = document.getElementById('hss-dynamic-sheet');
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = 'hss-dynamic-sheet';
      document.head.appendChild(sheet);
    }
    return sheet;
  },

  applyCollapsedGrid() {
    const sheet = this.getSheet();
    sheet.textContent = [
      'body.hss-active:not(.hss-sidebar-open) .p-tab_rail { width: 0 !important; min-width: 0 !important; overflow: hidden !important; }',
      'body.hss-active:not(.hss-sidebar-open) .p-client_workspace_wrapper { grid-template-columns: 0px 1fr !important; }',
      'body.hss-active:not(.hss-sidebar-open) .p-client_workspace__tabpanel { grid-template-columns: 0px 1fr !important; }',
      'body.hss-active:not(.hss-sidebar-open) .p-view_contents--sidebar { width: 0 !important; min-width: 0 !important; overflow: hidden !important; }',
      'body.hss-active:not(.hss-sidebar-open) .p-ia4_client__resizer--sidebar { display: none !important; pointer-events: none !important; }',
      'body.hss-active:not(.hss-sidebar-open) .p-control_strip { display: none !important; }',
    ].join('\n');
  },

  clearDynamicSheet() {
    const sheet = document.getElementById('hss-dynamic-sheet');
    if (sheet) sheet.textContent = '';
  },

  openSidebar() {
    this.cancelClose();
    this.closePending = false;
    document.body.classList.add('hss-sidebar-open');
    this.clearDynamicSheet();
    this.openLock = true;
    setTimeout(() => {
      this.openLock = false;
      if (this.closePending) {
        this.scheduleClose();
      }
    }, this.OPEN_LOCK_DURATION);
  },

  closeSidebar() {
    document.body.classList.remove('hss-sidebar-open');
    this.applyCollapsedGrid();
  },

  scheduleClose() {
    if (this.openLock) {
      this.closePending = true;
      return;
    }
    this.cancelClose();
    this.closeTimeout = setTimeout(() => {
      this.closeSidebar();
    }, this.CLOSE_DELAY);
  },

  cancelClose() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  },

  createHoverTrigger() {
    if (document.getElementById('hss-hover-trigger')) return;
    const strip = document.createElement('div');
    strip.id = 'hss-hover-trigger';
    document.body.appendChild(strip);
  },

  removeHoverTrigger() {
    const strip = document.getElementById('hss-hover-trigger');
    if (strip) strip.remove();
  },

  getSidebarBounds() {
    const tabRail = this.getTabRail();
    const sidebarContainer = this.getSidebarContainer();
    if (!tabRail || !sidebarContainer) return null;

    const tRect = tabRail.getBoundingClientRect();
    const sRect = sidebarContainer.getBoundingClientRect();

    return {
      left: Math.min(tRect.left, sRect.left),
      top: Math.min(tRect.top, sRect.top),
      right: Math.max(tRect.right, sRect.right),
      bottom: Math.max(tRect.bottom, sRect.bottom)
    };
  },

  isMouseInKeepAliveZone(x, y) {
    const bounds = this.getSidebarBounds();
    if (!bounds) return false;
    const p = this.KEEP_ALIVE_PADDING;
    return (
      x >= bounds.left - p &&
      x <= bounds.right + p &&
      y >= bounds.top - p &&
      y <= bounds.bottom + p
    );
  },

  attachDocumentListeners() {
    if (this.documentListenersAttached) return;
    const self = this;

    document.addEventListener('mouseover', function (e) {
      if (!document.body.classList.contains('hss-active')) return;

      const trigger = document.getElementById('hss-hover-trigger');
      if (e.target === trigger || (trigger && trigger.contains(e.target))) {
        self.openSidebar();
        return;
      }

      if (self.isSidebarElement(e.target)) {
        self.cancelClose();
        self.tagElements();
      }
    });

    document.addEventListener('mousemove', function (e) {
      if (!document.body.classList.contains('hss-active')) return;
      if (!document.body.classList.contains('hss-sidebar-open')) return;

      var x = e.clientX, y = e.clientY;
      var atEdge = x <= 1 || y <= 1 || x >= window.innerWidth - 1 || y >= window.innerHeight - 1;

      if (atEdge || !self.isMouseInKeepAliveZone(x, y)) {
        self.scheduleClose();
      } else {
        self.cancelClose();
      }
    });

    document.addEventListener('mouseleave', function () {
      if (!document.body.classList.contains('hss-active')) return;
      if (!document.body.classList.contains('hss-sidebar-open')) return;
      self.scheduleClose();
    });

    window.addEventListener('mouseout', function (e) {
      if (!document.body.classList.contains('hss-active')) return;
      if (!document.body.classList.contains('hss-sidebar-open')) return;
      if (!e.relatedTarget && !e.toElement) {
        self.scheduleClose();
      }
    });

    this.documentListenersAttached = true;
  },

  FULLSCREEN_THRESHOLD: 50,
  fullscreenTransitioning: false,

  checkFullscreen() {
    const isFull = window.innerWidth >= screen.width - this.FULLSCREEN_THRESHOLD;
    const wasFull = document.body.classList.contains('hss-fullscreen');
    if (isFull === wasFull) return;

    document.body.classList.toggle('hss-fullscreen', isFull);

    const container = document.querySelector('.hss-sidebar-container');
    if (container) {
      this.fullscreenTransitioning = true;
      container.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'width') {
          container.removeEventListener('transitionend', handler);
          HSS.fullscreenTransitioning = false;
        }
      });
    }
  },

  attachResizeListeners() {
    document.addEventListener('mousedown', function () {
      document.body.classList.add('hss-resizing');
    });

    document.addEventListener('mouseup', function () {
      document.body.classList.remove('hss-resizing');
    });
  },

  stateChangeHandler(state) {
    try {
      this.state = Object.assign({}, state);
      document.body.classList.toggle('hss-active', this.state.active);
      if (this.state.active) {
        this.tagElements();
        this.createHoverTrigger();
        this.attachDocumentListeners();
        this.attachResizeListeners();
        this.checkFullscreen();
        if (!this.boundCheckFullscreen) {
          this.boundCheckFullscreen = this.checkFullscreen.bind(this);
        }
        window.addEventListener('resize', this.boundCheckFullscreen);
        // Start with sidebar closed
        document.body.classList.remove('hss-sidebar-open');
        this.applyCollapsedGrid();
      } else {
        if (this.boundCheckFullscreen) {
          window.removeEventListener('resize', this.boundCheckFullscreen);
        }
        document.body.classList.remove('hss-fullscreen');
        this.cleanupDOM();
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  cleanupDOM() {
    const tabRail = this.getTabRail();
    if (tabRail) tabRail.classList.remove('hss-tab-rail');

    const sidebarContainer = this.getSidebarContainer();
    if (sidebarContainer) sidebarContainer.classList.remove('hss-sidebar-container');

    this.clearDynamicSheet();
    this.removeHoverTrigger();
    document.body.classList.remove('hss-sidebar-open');
  },

  init() {
    const styles = [
      'background: linear-gradient(#611f69, #e01e5a)',
      'border: 1px solid #4a154b',
      'color: white',
      'display: block',
      'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)',
      'line-height: 40px',
      'text-align: center',
      'font-weight: bold',
      'font-size: 18px'
    ].join(';');

    console.log('%c Hide Slack Sidebar extension initialising ', styles);

    if (!this.getTabRail() && !this.getSidebarContainer()) {
      return false;
    }

    console.log('%c Hide Slack Sidebar extension activated ', styles);
    return true;
  },

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, function (result) {
        resolve(result);
      });
    });
  }
};

chrome.runtime.onMessage.addListener(function (state) {
  let initialised = false;
  let timer = setInterval(function () {
    if (!initialised) {
      initialised = HSS.init(state);
    }
    if (initialised) {
      let handlerSuccess = HSS.stateChangeHandler(state);
      if (handlerSuccess) {
        clearInterval(timer);
      }
    }
  }, 200);
});
