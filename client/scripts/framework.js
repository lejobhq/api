class Page {
  constructor(id, resources) {
    this.id = id;
    this.$ = document.querySelector(`#${id}`);
    this.resources = resources;
  }

  async fetch() {
    if (this.resources) {
      let returnData = {};
      let errors = [];
      console.log(`Fetching data for ${this.id} ...`);
      await Promise.all(
        this.resources.map(resource =>
          fetch(`/api${resource.uri}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Access-Token": localStorage.getItem("jwt")
            }
          })
            .then(res => res.json())
            .then(({ data }) => {
              returnData = { ...returnData, ...data };
            })
            .catch(error => {
              errors.push(error);
            })
        )
      );

      if (errors.length) {
        return Promise.reject(errors);
      }
      return Promise.resolve(returnData);
    } else {
      return Promise.resolve();
    }
  }

  render(data = {}) {
    console.log(`Rendering ${this.id} ...`);
    Object.entries(data).forEach(([key, value]) => {
      document
        .querySelectorAll(`#${this.id} [data-value=${key}]`)
        .forEach(element => {
          switch (element.tagName) {
            case "SPAN":
              const currentValue = element.textContent;
              if (currentValue !== value) {
                element.innerText = value;
              }
              break;
            case "UL":
              element.innerHTML = value
                .map(
                  v => `
                  <li id=${v.id}>${v.url}</li>
                `
                )
                .join("");
              break;
            // TODO: Add more tag handlers
            default:
              break;
          }
        });
    });
  }
}

// Redux-like router
const createRouter = (pages = []) => {
  let _route;
  function mount(page) {
    page
      .fetch()
      .then(data => {
        page.render(data);
        page.$.classList.remove("hidden");
      })
      .catch(error => {
        // TODO
        console.error(error);
      });
  }
  return {
    navigate: to => {
      _route = to;

      Object.values(pages).forEach(page => {
        page.$.classList.add("hidden");
      });

      mount(pages[to]);
    },
    getRoute: _ => _route
  };
};
