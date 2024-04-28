const DISPLAY_BOX = "\u25A1";

// Sam Rose's original set of symbols, will be used as ultimate fallback
const symbols_default = ["©", "®", "™", "“", "”", "—", "—", "…", "½", "¼", "∞", "é", "á", "à", "ç", "€", "¥", "¢"];
const collections = [
    "default",
    "hebrew",
    "numberset",
]


let symbols = []
let file_drop_zone = null;
let symbol_drop_zone = null;


async function getSymbols() {
    try {
        symbols = sanitise(JSON.parse(window.localStorage.getItem("symbols")));
        if (symbols.length === 0) {
            res = await fetch("./symbol/default.json");
            symbols = sanitise(await res.json());
        }
    } catch(err) {
        console.error(err);
    }
    if (symbols.length === 0) {
        symbols = symbols_default
            .map((s) => {
                return {
                    glyph: s,
                    name: s
                };
            });
    }
}


function sanitise(symbols) {
    if (!Array.isArray(symbols)) {
        return [];
    }
    return symbols.filter((s) => 
        s !== null &&
        typeof s === "object" &&
        !Array.isArray(s) &&
        s.hasOwnProperty("glyph") &&
        s.hasOwnProperty("name")
    );
}


function search(searchTerm) {
    searchTerm = searchTerm?.toLowerCase() ?? "";

    return symbols.filter((s) => {
        /* Get hex representation of codepoint, e.g. 00A0 for &nbsp; or 20AC for € */
        const codePoint = s.glyph.codePointAt(0)?.toString(16).padStart(4, 0);

        const searchTerms = [
            s.name,
            s.glyph,
            ...s.searchTerms ?? [],
            `U+${codePoint}`,
            `0x${codePoint}`
        ];
        return searchTerm === "" || searchTerms.join(" ").toLowerCase().includes(searchTerm);
    });
}

function addSymbol() {
    symbols.unshift({
        glyph: "",
        name: "",
        // For now: no display and search terms
    });
    // Better to just add the one div for the symbol
    // For now this is fast enough.
    renderSymbols();
    editSymbol(document.getElementsByClassName("symbol")[0], "glyph");
}

function editSymbol(elem, classname) {
    const handleAction = (target) => {
        symbols[target.dataset.index][target.dataset.classname] = target.value;
        if (!symbols[target.dataset.index].name) {
            symbols[target.dataset.index].name = symbols[target.dataset.index].glyph;
            target.parentElement.parentElement.getElementsByClassName("name")[0].textContent = symbols[target.dataset.index].name;
        }
        target.parentElement.parentElement.title = symbols[target.dataset.index].name;
        target.parentElement.textContent = target.value;
        window.localStorage.setItem("symbols", JSON.stringify(symbols));
        return true;
    }
    
    elem.classList.remove("clicked");
    elemClass = elem.getElementsByClassName(classname)[0];
    input = document.createElement("input");    
    input.dataset.classname = classname;
    input.dataset.index = Array.from(elem.parentElement.children).indexOf(elem);
    input.value = symbols[input.dataset.index][classname];
    input.addEventListener("blur", (e) => handleAction(e.target))
    input.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "Enter":
                handleAction(e.target);
                break;
            case "Escape":
                e.target.parentElement.textContent = 
                    symbols[e.target.dataset.index][e.target.dataset.classname];
                break;
        }
    });
    elemClass.innerHTML = "";
    elemClass.appendChild(input);
    input.focus();
}

function isNotEditingSymbol() {
    return document
        .getElementsByClassName("symbols")[0]
        .getElementsByTagName("INPUT")
        .length === 0;
}

function removeSymbol(elem) {
    symbols.splice(Array.from(elem.parentElement.children).indexOf(elem), 1);
    window.localStorage.setItem("symbols", JSON.stringify(symbols));
    elem.remove();
}
function saveSymbols() {
    const link = document.createElement("a");
    const file = new Blob([JSON.stringify(symbols, null, "\t")], { type: "text/plain" });
    link.href = URL.createObjectURL(file);
    link.download = (document.querySelector('input[type="text"]').value || "symbols") + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
}

function renderNoSymbols(parent) {
    const span = document.createElement("span"); 
    span.innerHTML = document.getElementById("no_symbols").innerHTML;
    const collectionsElem = span.querySelector("#collections");
    collections.forEach(c => {
        const replace_elem = document.createElement("a");
        replace_elem.textContent = "[rep]";
        replace_elem.href = '#';
        replace_elem.addEventListener("click", async (e) => {
            e.preventDefault();
            res = await fetch("./symbol/"+c+".json");
            symbols = sanitise(await res.json());
			renderSymbols();
        });
        collectionsElem.appendChild(replace_elem);

        const insert_elem = document.createElement("a");
        insert_elem.textContent = "[add]";
        insert_elem.href = "#";
        replace_elem.addEventListener("click", async (e) => {
            e.preventDefault();
            openElement(file_drop_zone);
            res = await fetch("./symbol/"+c+".json");
            symbolssymbols.push(...sanitise(await res.json()));
			renderSymbols();
        })
        collectionsElem.appendChild(insert_elem);
        
        const name_elem = document.createElement("a");
        name_elem.textContent = c;
        name_elem.href = "./symbol/"+c+".json";
        collectionsElem.appendChild(name_elem);
    });
    parent.appendChild(span);
}

function renderSymbols(searchTerm) {
    const parent = document.querySelector(".symbols");
    parent.innerHTML = "";

    const results = search(searchTerm);
    if (results.length === 0) {
        renderNoSymbols(parent);
        return;
        const span = document.createElement("span");
        span.innerHTML = document.getElementById("no_symbols").innerHTML;
        parent.appendChild(span);
        return;
    }

    for (const symbol of results) {
        const elem = document.createElement("div");
        const glyphElem = document.createElement("div");
        const nameElem = document.createElement("div");
        const copyElem = document.createElement("div");
        const removeElem = document.createElement("div");

        elem.classList = "symbol";
        elem.tabIndex = 0;
        elem.title = symbol.name;
        elem.setAttribute("draggable", "true");

        glyphElem.classList = "glyph";
        glyphElem.textContent = symbol.display || symbol.glyph;

        nameElem.classList = "name";
        nameElem.textContent = symbol.name;

        copyElem.classList = "copy";
        copyElem.innerHTML = document.getElementById("copied").innerHTML;
        
        removeElem.classList = "remove";
        
        elem.appendChild(glyphElem);
        elem.appendChild(nameElem);
        elem.appendChild(copyElem);
        elem.appendChild(removeElem);

        const handleAction = () => {
            if (elem.classList.contains("clicked") || !isNotEditingSymbol()) {
                return;
            }

            navigator.clipboard.writeText(symbol.glyph);

            console.log(`Copied ${symbol.name} (${symbol.glyph})!`);
            elem.classList.add("clicked");

            setTimeout(() => {
                elem.classList.remove("clicked");
            }, 1000);
        };
        elem.addEventListener("click", handleAction);
        elem.addEventListener("keydown", (event) => {
            if (isNotEditingSymbol()) {
                switch (event.key) {
                    case " ":
                    case "Enter":
                        event.preventDefault();
                        handleAction();
                        break;
                    case "Delete":
                        removeSymbol(event.target);
                        break;
                }
            }
        });
        parent.appendChild(elem);
    }
}

function openElement(elem) {
    elem.classList.add("open");
    elem.dataset.open_counter |= 0;
    elem.dataset.open_counter++;
    window.setTimeout((elem) => {
        elem.dataset.open_counter--;
        if (+elem.dataset.open_counter === 0) {
            elem.classList.remove("open");
        }
    }, 5000, elem);
}

function fileHandler(file) {
    if (file.type === "application/json") {
        const dataset = file_drop_zone.dataset;
        +dataset.todo++;
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onloadend = () => {
            +dataset.todo--;
            try {
                const content = sanitise(JSON.parse(reader.result));
                if (content.length) {
                    if (
                        !+dataset.uploads && 
                        !document
                            .getElementById("save_symbols")
                            .classList
                            .contains("open")
                    ) {
                        symbols = [];
                    }
                    openElement(file_drop_zone);
                    +dataset.uploads++;
                    symbols.push(...content);
                }
            } catch(err) {
                console.error(err);
            }
            if (!+dataset.todo) {
                console.log("Number of files loaded:", dataset.uploads);
                window.localStorage.setItem("symbols", JSON.stringify(symbols));
                renderSymbols();
            }
        }
    }
}

function dragOverHandler(ev) {
  ev.preventDefault();
  ev.target.classList.add("over");
}

function dragLeaveHandler(ev) {
  ev.preventDefault();
  ev.target.classList.remove("over");
}

function dropHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    ev.target.classList.remove("over");
    file_drop_zone.dataset.uploads = 0;
    file_drop_zone.dataset.todo = 0;

    if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...ev.dataTransfer.items].forEach((item, i) => {
        // If dropped items aren't files, reject them
        if (item.kind === "file") {
        fileHandler(item.getAsFile());
        }
    });
    } else {
    // Use DataTransfer interface to access the file(s)
    [...ev.dataTransfer.files].forEach((file) => {
        fileHandler(file);
    });
    }    
}

function handleDragStart(e) {
    e.target.classList.add("drag");
    symbol_drop_zone.dataset.dragIndex = 
        Array.from(e.target.parentElement.children).indexOf(e.target);
}

function handleDragEnd(e) {
    e.target.classList.remove("drag");
    Array.from(e.target.parentElement.children).forEach(elem => elem.classList.remove("over"));
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDragEnter(e) {
    Array.from(document.getElementsByClassName("over"))
        .forEach(elem => elem.classList.remove("over"));
    let target = e.target;
    while (target) {
        if (target.classList?.contains("symbol")) {
            target.classList.add("over");
            break;
        }
        target = target.parentElement
    }
}

function handleDrop(e) {
    e.preventDefault();
    let target = e.target;
    while (target) {
        if (target.classList?.contains("symbol")) {
            const parentElem = target.parentElement;
            const dragIndex = parseInt(parentElem.dataset.dragIndex);
            const dragTarget = Array.from(parentElem.children).indexOf(target);
            
            if (!(dragIndex >= 0)) {
                return false;
            }                
            
            symbols.splice(dragTarget, 0, symbols.splice(dragIndex, 1)[0]);
            window.localStorage.setItem("symbols", JSON.stringify(symbols));
            
            if (dragIndex < dragTarget) {
                if (target.nextElementSibling) { 
                    target.nextElementSibling.before(
                        parentElem.children[dragIndex]
                    );
                } else {
                    parentElem.appendChild(parentElem.children[dragIndex]);
                }
            } else {
                target.before(parentElem.children[dragIndex]);
            }
            break;
        }
        target = target.parentElement;
    }
    e.stopPropagation();
    return false;
}

document.addEventListener("DOMContentLoaded", async () => {
    await getSymbols();
    file_drop_zone = document.getElementById("save_symbols");
    symbol_drop_zone = document.getElementsByClassName("symbols")[0];
    
    const search = window.location.hash ? window.location.hash.substring(1) : "";
    renderSymbols(search);

    const searchInput = document.querySelector(".search input");
    searchInput.value = search;
    searchInput.addEventListener("input", (e) => {
        renderSymbols(e.target.value);
    });
    searchInput.addEventListener("blur", (e) => {
        window.location.hash = e.target.value;
        return false;
    });

    window.addEventListener("hashchange", () => {
        const search = window.location.hash ? window.location.hash.substring(1) : "";
        searchInput.value = search;
        renderSymbols(search);
    });
    
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("add")) {
            e.preventDefault();
            addSymbol();
        }
    });
    
    window.addEventListener("dblclick", (e) => {
        let target = e.target;
        while(target) {
            if (target.classList?.contains("remove")) {
                return removeSymbol(target.parentElement);
            }
            if (target.classList?.contains("glyph")) {
                return editSymbol(target.parentElement, "glyph");
            }
            if (target.classList?.contains("name")) {
                return editSymbol(target.parentElement, "name");
            }
            if (target.classList?.contains("copy")) {
                return editSymbol(target.parentElement, "name");
            }
            if (target.classList?.contains("symbol")) {
                return editSymbol(target, "glyph");
            }
            target = target.parentElement;
        }
    });

    file_drop_zone.addEventListener("click", () => saveSymbols());
    file_drop_zone.addEventListener("drop", dropHandler);
    file_drop_zone.addEventListener("dragover", dragOverHandler);
    file_drop_zone.addEventListener("dragleave", dragLeaveHandler);
    
    symbol_drop_zone.addEventListener("dragstart", handleDragStart);
    symbol_drop_zone.addEventListener("dragover", handleDragOver);
    symbol_drop_zone.addEventListener("dragenter", handleDragEnter);
    symbol_drop_zone.addEventListener("dragend", handleDragEnd);
    symbol_drop_zone.addEventListener("drop", handleDrop);
});




