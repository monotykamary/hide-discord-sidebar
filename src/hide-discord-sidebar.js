const HDS = {
  state: {},
  closeTimeout: null,
  openLock: false,
  documentListenersAttached: false,
  boundCheckFullscreen: null,
  CLOSE_DELAY: 250,
  OPEN_LOCK_DURATION: 500,
  KEEP_ALIVE_PADDING: 60,

  getServers() {
    return document.getElementsByClassName('guildsWrapper-5TJh6A')[0]
      || document.getElementsByClassName('wrapper-1Rf91z')[0]
      || document.getElementsByClassName('wrapper-3NnKdC')[0]
      || document.querySelector("nav[class*=wrapper-]")
      || document.querySelector("nav[class*=guilds]")
      || document.querySelector("nav[aria-label*='Servers sidebar']");
  },

  getSidebarContainer() {
    const guilds = this.getServers();
    const sidebarList = document.querySelector('div[class*="sidebarList"]');
    if (!guilds || !sidebarList) return null;

    const layoutParent = guilds.parentElement;
    let el = sidebarList;
    while (el && el !== layoutParent) {
      if (el.parentElement === layoutParent) {
        return el;
      }
      el = el.parentElement;
    }

    return sidebarList.parentElement;
  },

  // The outer app grid that reserves the 32px "titleBar" row.
  // Walk up from the server list to the first ancestor whose
  // grid-template-areas defines the titleBar area. (The intermediate
  // layout wrapper and content grid do not declare named areas, so they
  // are skipped.) Robust to Discord's per-build class-name hashes.
  getBaseGrid() {
    const guilds = this.getServers();
    if (!guilds) return null;
    let el = guilds.parentElement;
    while (el && el !== document.body) {
      const areas = getComputedStyle(el).gridTemplateAreas;
      if (areas && areas.includes('titleBar')) return el;
      el = el.parentElement;
    }
    return null;
  },

  // The titlebar grid item itself: the child of the app grid placed in
  // the "titleBar" grid area.
  getTitlebar() {
    const grid = this.getBaseGrid();
    if (!grid) return null;
    return Array.from(grid.children).find(
      (child) => getComputedStyle(child).gridArea === 'titleBar'
    ) || null;
  },

  isSidebarElement(el) {
    if (!el) return false;
    return !!(
      el.closest('.hds-guilds')
      || el.closest('.hds-sidebar-container')
      || el.closest('nav[class*="wrapper-"]')
      || el.closest('nav[class*="guilds"]')
      || el.closest('nav[aria-label*="Servers sidebar"]')
      || el.closest('div[class*="sidebarList"]')
    );
  },

  tagElements() {
    const guilds = this.getServers();
    if (guilds && !guilds.classList.contains('hds-guilds')) {
      guilds.classList.add('hds-guilds');
    }

    const sidebarContainer = this.getSidebarContainer();
    if (sidebarContainer && !sidebarContainer.classList.contains('hds-sidebar-container')) {
      sidebarContainer.classList.add('hds-sidebar-container');
    }

    const baseGrid = this.getBaseGrid();
    if (baseGrid && !baseGrid.classList.contains('hds-base')) {
      baseGrid.classList.add('hds-base');
    }

    const titlebar = this.getTitlebar();
    if (titlebar && !titlebar.classList.contains('hds-titlebar')) {
      titlebar.classList.add('hds-titlebar');
    }
  },

  closePending: false,

  openSidebar() {
    this.cancelClose();
    this.closePending = false;
    document.body.classList.add('hds-sidebar-open');
    this.openLock = true;
    setTimeout(() => {
      this.openLock = false;
      if (this.closePending) {
        this.scheduleClose();
      }
    }, this.OPEN_LOCK_DURATION);
  },

  closeSidebar() {
    document.body.classList.remove('hds-sidebar-open');
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
    if (document.getElementById('hds-hover-trigger')) return;
    const strip = document.createElement('div');
    strip.id = 'hds-hover-trigger';
    document.body.appendChild(strip);
  },

  removeHoverTrigger() {
    const strip = document.getElementById('hds-hover-trigger');
    if (strip) strip.remove();
  },

  getSidebarBounds() {
    const guilds = this.getServers();
    const sidebarContainer = document.querySelector('.hds-sidebar-container');
    if (!guilds || !sidebarContainer) return null;

    const gRect = guilds.getBoundingClientRect();
    const sRect = sidebarContainer.getBoundingClientRect();

    return {
      left: Math.min(gRect.left, sRect.left),
      top: Math.min(gRect.top, sRect.top),
      right: Math.max(gRect.right, sRect.right),
      bottom: Math.max(gRect.bottom, sRect.bottom)
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
      if (!document.body.classList.contains('hide-dis-bar')) return;

      const trigger = document.getElementById('hds-hover-trigger');
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
      if (!document.body.classList.contains('hide-dis-bar')) return;
      if (!document.body.classList.contains('hds-sidebar-open')) return;

      var x = e.clientX, y = e.clientY;
      var atEdge = x <= 1 || y <= 1 || x >= window.innerWidth - 1 || y >= window.innerHeight - 1;

      if (atEdge || !self.isMouseInKeepAliveZone(x, y)) {
        self.scheduleClose();
      } else {
        self.cancelClose();
      }
    });

    document.addEventListener('mouseleave', function () {
      if (!document.body.classList.contains('hide-dis-bar')) return;
      if (!document.body.classList.contains('hds-sidebar-open')) return;
      self.scheduleClose();
    });

    window.addEventListener('mouseout', function (e) {
      if (!document.body.classList.contains('hide-dis-bar')) return;
      if (!document.body.classList.contains('hds-sidebar-open')) return;
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
    const wasFull = document.body.classList.contains('hds-fullscreen');
    if (isFull === wasFull) return;

    document.body.classList.toggle('hds-fullscreen', isFull);

    const container = document.querySelector('.hds-sidebar-container');
    if (container) {
      this.fullscreenTransitioning = true;
      container.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'width') {
          container.removeEventListener('transitionend', handler);
          HDS.fullscreenTransitioning = false;
        }
      });
    }
  },

  attachResizeListeners() {
    document.addEventListener('mousedown', function () {
      document.body.classList.add('hds-resizing');
    });

    document.addEventListener('mouseup', function () {
      document.body.classList.remove('hds-resizing');
    });
  },

  stateChangeHandler(state) {
    try {
      this.state = Object.assign({}, state);
      document.body.classList.toggle("hide-dis-bar", this.state.active);
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
        document.body.classList.remove('hds-sidebar-open');
      } else {
        if (this.boundCheckFullscreen) {
          window.removeEventListener('resize', this.boundCheckFullscreen);
        }
        document.body.classList.remove('hds-fullscreen');
        this.cleanupDOM();
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  cleanupDOM() {
    const guilds = this.getServers();
    if (guilds) guilds.classList.remove('hds-guilds');

    const sidebarContainer = this.getSidebarContainer();
    if (sidebarContainer) sidebarContainer.classList.remove('hds-sidebar-container');

    const titlebar = this.getTitlebar();
    if (titlebar) titlebar.classList.remove('hds-titlebar');

    const baseGrid = this.getBaseGrid();
    if (baseGrid) baseGrid.classList.remove('hds-base');

    this.removeHoverTrigger();
    document.body.classList.remove('hds-sidebar-open');
  },

  init() {
    const styles = [
      'background: linear-gradient(#D33106, #571402)',
      'border: 1px solid #3E0E02',
      'color: white',
      'display: block',
      'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)',
      'background-image: linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
      'line-height: 40px',
      'text-align: center',
      'font-weight: bold',
      'font-size: 18px'
    ].join(';');

    console.log('%c Hide Discord Sidebar extension initialising ', styles);

    if (!this.getServers()) {
      return false;
    }

    console.log('%c Hide Discord Sidebar extension activated ', styles);
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
      initialised = HDS.init(state);
    }
    if (initialised) {
      let handlerSuccess = HDS.stateChangeHandler(state);
      if (handlerSuccess) {
        clearInterval(timer);
      }
    }
  }, 200);
});
