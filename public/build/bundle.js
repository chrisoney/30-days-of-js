
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const days = {
      0: {
        day: 'home',
        title: "Home",
        completed: true,
      },
      1: {
        day: 1,
        title: "01 - Javascript Drum Kit",
        completed: true,
      },
      2: {
        day: 2, 
        title: "02 - JS and CSS Clock",
        completed: true,
      },
      3: {
        day: 3,
        title: "03 - CSS Variables",
        completed: true,
      },
      4: {
        day: 4,
        title: "04 - Array Cardio Day 1",
        completed: true,
      },
      5: {
        day: 5,
        title: "05 - Flex Panel Gallery",
        completed: true,
      },
      6: {
        day: 6,
        title: "06 - Type Ahead",
        completed: false,
      },
      7: {
        day: 7,
        title: "07 - Array Cardio Day 2",
        completed: false,
      },
      8: {
        day: 8,
        title: "08 - Fun with HTML5 Canvas",
        completed: false,
      },
      9: {
        day: 9,
        title: "09 - Dev Tools Domination",
        completed: false,
      },
      10: {
        day: 10,
        title: "10 - Hold Shift and Check Checkboxes",
        completed: false,
      },
      11: {
        day: 11,
        title: "11 - Custom Video Player",
        completed: false,
      },
      12: {
        day: 12,
        title: "12 - Key Sequence Detection",
        completed: false,
      },
      13: {
        day: 13,
        title: "13 - Slide in on Scroll",
        completed: false,
      },
      14: {
        day: 14,
        title: "14 - JavaScript References VS Copying",
        completed: false,
      },
      15: {
        day: 15,
        title: "15 - LocalStorage",
        completed: false,
      },
      16: {
        day: 16,
        title: "16 - Mouse Move Shadow",
        completed: false,
      },
      17: {
        day: 17,
        title: "17 - Sort Without Articles",
        completed: false,
      },
      18: {
        day: 18,
        title: "18 - Adding Up Times with Reduce",
        completed: false,
      },
      19: {
        day: 19,
        title: "19 - Webcam Fun",
        completed: false,
      },
      20: {
        day: 20,
        title: "20 - Speech Detection",
        completed: false,
      },
      21: {
        day: 21,
        title: "21 - Geolocation",
        completed: false,
      },
      22: {
        day: 22,
        title: "22 - Follow Along Link Highlighter",
        completed: false,
      },
      23: {
        day: 23,
        title: "23 - Speech Synthesis",
        completed: false,
      },
      24: {
        day: 24,
        title: "24 - Sticky Nav",
        completed: false,
      },
      25: {
        day: 25,
        title: "25 - Event Capture, Propagation, Bubbling and Once",
        completed: false,
      },
      26: {
        day: 26,
        title: "26 - Stripe Follow Along Nav",
        completed: false,
      },
      27: {
        day: 27,
        title: "27 - Click and Drag",
        completed: false,
      },
      28: {
        day: 28,
        title: "28 - Video Speed Controller",
        completed: false,
      },
      29: {
        day: 29,
        title: "29 - Countdown Timer",
        completed: false,
      },
      30: {
        day: 30,
        title: "30 - Whack A Mole",
        completed: false,
      },
    };

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const page = writable(0);
    const modalOpen = writable(false);

    /* src/Modal.svelte generated by Svelte v3.29.0 */

    const { Object: Object_1 } = globals;
    const file = "src/Modal.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (34:3) {#each Object.values(days) as day}
    function create_each_block(ctx) {
    	let li;
    	let t0_value = /*day*/ ctx[6].title + "";
    	let t0;
    	let t1;
    	let li_class_value;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[2](/*day*/ ctx[6], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(li, "class", li_class_value = "" + (null_to_empty(!/*day*/ ctx[6].completed ? "not-done" : "") + " svelte-ho6qms"));
    			add_location(li, file, 34, 4, 708);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:3) {#each Object.values(days) as day}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let ul;
    	let div0_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = Object.values(days);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file, 32, 2, 661);
    			attr_dev(div0, "class", "modal svelte-ho6qms");
    			add_location(div0, file, 31, 1, 593);
    			attr_dev(div1, "class", "modal-area svelte-ho6qms");
    			add_location(div1, file, 30, 0, 536);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*click_handler_1*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Object, days, switchPage*/ 1) {
    				each_value = Object.values(days);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fly, { x: -510, duration: 750 }, true);
    				div0_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fly, { x: -510, duration: 750 }, false);
    			div0_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div0_transition) div0_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Modal", slots, []);
    	let pageNum;

    	// export let modalOpen;
    	const unsubscribe = page.subscribe(value => {
    		pageNum = value;
    	});

    	function switchPage(e, num, done) {
    		e.preventDefault();

    		if (!done) {
    			modalOpen.update(n => n = true);
    			return;
    		}

    		page.update(n => n = num);
    		modalOpen.update(n => n = false);
    	}

    	function closeModal(e) {
    		e.preventDefault();
    		modalOpen.update(n => false);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (day, e) => switchPage(e, day.day, day.completed);
    	const click_handler_1 = e => closeModal(e);

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		page,
    		modalOpen,
    		days,
    		pageNum,
    		unsubscribe,
    		switchPage,
    		closeModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("pageNum" in $$props) pageNum = $$props.pageNum;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [switchPage, closeModal, click_handler, click_handler_1];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/day_files/Home.svelte generated by Svelte v3.29.0 */

    const file$1 = "src/day_files/Home.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let p;
    	let t0;
    	let a;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text("30 Days of Javascript is a series of tutorials for fun javascript pages set up by\n\tWes Bos ");
    			a = element("a");
    			a.textContent = "here";
    			t2 = text(". Between the great ideas and \n\tthe fantastic tutorials, it's a great way to refine your skills as a developer with\n\tvery little time commitment. Check out the projects I've completed so far and visit\n\tthe site to start doing the same for free!");
    			attr_dev(a, "href", "https://javascript30.com/");
    			attr_dev(a, "class", "svelte-1r245p0");
    			add_location(a, file$1, 6, 9, 150);
    			attr_dev(p, "class", "svelte-1r245p0");
    			add_location(p, file$1, 5, 1, 56);
    			attr_dev(div, "class", "welcome-description svelte-1r245p0");
    			add_location(div, file$1, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(p, t2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/day_files/DayOne/DayOne.svelte generated by Svelte v3.29.0 */
    const file$2 = "src/day_files/DayOne/DayOne.svelte";

    function create_fragment$2(ctx) {
    	let div11;
    	let div10;
    	let div0;
    	let kbd0;
    	let t1;
    	let span0;
    	let t3;
    	let div1;
    	let kbd1;
    	let t5;
    	let span1;
    	let t7;
    	let div2;
    	let kbd2;
    	let t9;
    	let span2;
    	let t11;
    	let div3;
    	let kbd3;
    	let t13;
    	let span3;
    	let t15;
    	let div4;
    	let kbd4;
    	let t17;
    	let span4;
    	let t19;
    	let div5;
    	let kbd5;
    	let t21;
    	let span5;
    	let t23;
    	let div6;
    	let kbd6;
    	let t25;
    	let span6;
    	let t27;
    	let div7;
    	let kbd7;
    	let t29;
    	let span7;
    	let t31;
    	let div8;
    	let kbd8;
    	let t33;
    	let span8;
    	let t35;
    	let div9;
    	let t36;
    	let audio0;
    	let track0;
    	let audio0_src_value;
    	let t37;
    	let audio1;
    	let track1;
    	let audio1_src_value;
    	let t38;
    	let audio2;
    	let track2;
    	let audio2_src_value;
    	let t39;
    	let audio3;
    	let track3;
    	let audio3_src_value;
    	let t40;
    	let audio4;
    	let track4;
    	let audio4_src_value;
    	let t41;
    	let audio5;
    	let track5;
    	let audio5_src_value;
    	let t42;
    	let audio6;
    	let track6;
    	let audio6_src_value;
    	let t43;
    	let audio7;
    	let track7;
    	let audio7_src_value;
    	let t44;
    	let audio8;
    	let track8;
    	let audio8_src_value;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div10 = element("div");
    			div0 = element("div");
    			kbd0 = element("kbd");
    			kbd0.textContent = "A";
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = "clap";
    			t3 = space();
    			div1 = element("div");
    			kbd1 = element("kbd");
    			kbd1.textContent = "S";
    			t5 = space();
    			span1 = element("span");
    			span1.textContent = "hihat";
    			t7 = space();
    			div2 = element("div");
    			kbd2 = element("kbd");
    			kbd2.textContent = "D";
    			t9 = space();
    			span2 = element("span");
    			span2.textContent = "kick";
    			t11 = space();
    			div3 = element("div");
    			kbd3 = element("kbd");
    			kbd3.textContent = "F";
    			t13 = space();
    			span3 = element("span");
    			span3.textContent = "openhat";
    			t15 = space();
    			div4 = element("div");
    			kbd4 = element("kbd");
    			kbd4.textContent = "G";
    			t17 = space();
    			span4 = element("span");
    			span4.textContent = "boom";
    			t19 = space();
    			div5 = element("div");
    			kbd5 = element("kbd");
    			kbd5.textContent = "H";
    			t21 = space();
    			span5 = element("span");
    			span5.textContent = "ride";
    			t23 = space();
    			div6 = element("div");
    			kbd6 = element("kbd");
    			kbd6.textContent = "J";
    			t25 = space();
    			span6 = element("span");
    			span6.textContent = "snare";
    			t27 = space();
    			div7 = element("div");
    			kbd7 = element("kbd");
    			kbd7.textContent = "K";
    			t29 = space();
    			span7 = element("span");
    			span7.textContent = "tom";
    			t31 = space();
    			div8 = element("div");
    			kbd8 = element("kbd");
    			kbd8.textContent = "L";
    			t33 = space();
    			span8 = element("span");
    			span8.textContent = "tink";
    			t35 = space();
    			div9 = element("div");
    			t36 = space();
    			audio0 = element("audio");
    			track0 = element("track");
    			t37 = space();
    			audio1 = element("audio");
    			track1 = element("track");
    			t38 = space();
    			audio2 = element("audio");
    			track2 = element("track");
    			t39 = space();
    			audio3 = element("audio");
    			track3 = element("track");
    			t40 = space();
    			audio4 = element("audio");
    			track4 = element("track");
    			t41 = space();
    			audio5 = element("audio");
    			track5 = element("track");
    			t42 = space();
    			audio6 = element("audio");
    			track6 = element("track");
    			t43 = space();
    			audio7 = element("audio");
    			track7 = element("track");
    			t44 = space();
    			audio8 = element("audio");
    			track8 = element("track");
    			attr_dev(kbd0, "class", "svelte-1fvjhws");
    			add_location(kbd0, file$2, 23, 6, 599);
    			attr_dev(span0, "class", "sound svelte-1fvjhws");
    			add_location(span0, file$2, 24, 6, 618);
    			attr_dev(div0, "data-key", "65");
    			attr_dev(div0, "class", "key svelte-1fvjhws");
    			add_location(div0, file$2, 22, 4, 561);
    			attr_dev(kbd1, "class", "svelte-1fvjhws");
    			add_location(kbd1, file$2, 27, 6, 703);
    			attr_dev(span1, "class", "sound svelte-1fvjhws");
    			add_location(span1, file$2, 28, 6, 722);
    			attr_dev(div1, "data-key", "83");
    			attr_dev(div1, "class", "key svelte-1fvjhws");
    			add_location(div1, file$2, 26, 4, 665);
    			attr_dev(kbd2, "class", "svelte-1fvjhws");
    			add_location(kbd2, file$2, 31, 6, 808);
    			attr_dev(span2, "class", "sound svelte-1fvjhws");
    			add_location(span2, file$2, 32, 6, 827);
    			attr_dev(div2, "data-key", "68");
    			attr_dev(div2, "class", "key svelte-1fvjhws");
    			add_location(div2, file$2, 30, 4, 770);
    			attr_dev(kbd3, "class", "svelte-1fvjhws");
    			add_location(kbd3, file$2, 35, 6, 912);
    			attr_dev(span3, "class", "sound svelte-1fvjhws");
    			add_location(span3, file$2, 36, 6, 931);
    			attr_dev(div3, "data-key", "70");
    			attr_dev(div3, "class", "key svelte-1fvjhws");
    			add_location(div3, file$2, 34, 4, 874);
    			attr_dev(kbd4, "class", "svelte-1fvjhws");
    			add_location(kbd4, file$2, 39, 6, 1019);
    			attr_dev(span4, "class", "sound svelte-1fvjhws");
    			add_location(span4, file$2, 40, 6, 1038);
    			attr_dev(div4, "data-key", "71");
    			attr_dev(div4, "class", "key svelte-1fvjhws");
    			add_location(div4, file$2, 38, 4, 981);
    			attr_dev(kbd5, "class", "svelte-1fvjhws");
    			add_location(kbd5, file$2, 43, 6, 1123);
    			attr_dev(span5, "class", "sound svelte-1fvjhws");
    			add_location(span5, file$2, 44, 6, 1142);
    			attr_dev(div5, "data-key", "72");
    			attr_dev(div5, "class", "key svelte-1fvjhws");
    			add_location(div5, file$2, 42, 4, 1085);
    			attr_dev(kbd6, "class", "svelte-1fvjhws");
    			add_location(kbd6, file$2, 47, 6, 1227);
    			attr_dev(span6, "class", "sound svelte-1fvjhws");
    			add_location(span6, file$2, 48, 6, 1246);
    			attr_dev(div6, "data-key", "74");
    			attr_dev(div6, "class", "key svelte-1fvjhws");
    			add_location(div6, file$2, 46, 4, 1189);
    			attr_dev(kbd7, "class", "svelte-1fvjhws");
    			add_location(kbd7, file$2, 51, 6, 1332);
    			attr_dev(span7, "class", "sound svelte-1fvjhws");
    			add_location(span7, file$2, 52, 6, 1351);
    			attr_dev(div7, "data-key", "75");
    			attr_dev(div7, "class", "key svelte-1fvjhws");
    			add_location(div7, file$2, 50, 4, 1294);
    			attr_dev(kbd8, "class", "svelte-1fvjhws");
    			add_location(kbd8, file$2, 55, 6, 1435);
    			attr_dev(span8, "class", "sound svelte-1fvjhws");
    			add_location(span8, file$2, 56, 6, 1454);
    			attr_dev(div8, "data-key", "76");
    			attr_dev(div8, "class", "key svelte-1fvjhws");
    			add_location(div8, file$2, 54, 4, 1397);
    			attr_dev(div9, "class", "playing svelte-1fvjhws");
    			set_style(div9, "display", "none");
    			add_location(div9, file$2, 58, 2, 1497);
    			attr_dev(div10, "class", "keys svelte-1fvjhws");
    			add_location(div10, file$2, 21, 2, 538);
    			attr_dev(track0, "kind", "captions");
    			add_location(track0, file$2, 61, 45, 1603);
    			attr_dev(audio0, "data-key", "65");
    			if (audio0.src !== (audio0_src_value = "sounds/clap.wav")) attr_dev(audio0, "src", audio0_src_value);
    			add_location(audio0, file$2, 61, 2, 1560);
    			attr_dev(track1, "kind", "captions");
    			add_location(track1, file$2, 62, 46, 1681);
    			attr_dev(audio1, "data-key", "83");
    			if (audio1.src !== (audio1_src_value = "sounds/hihat.wav")) attr_dev(audio1, "src", audio1_src_value);
    			add_location(audio1, file$2, 62, 2, 1637);
    			attr_dev(track2, "kind", "captions");
    			add_location(track2, file$2, 63, 45, 1758);
    			attr_dev(audio2, "data-key", "68");
    			if (audio2.src !== (audio2_src_value = "sounds/kick.wav")) attr_dev(audio2, "src", audio2_src_value);
    			add_location(audio2, file$2, 63, 2, 1715);
    			attr_dev(track3, "kind", "captions");
    			add_location(track3, file$2, 64, 48, 1838);
    			attr_dev(audio3, "data-key", "70");
    			if (audio3.src !== (audio3_src_value = "sounds/openhat.wav")) attr_dev(audio3, "src", audio3_src_value);
    			add_location(audio3, file$2, 64, 2, 1792);
    			attr_dev(track4, "kind", "captions");
    			add_location(track4, file$2, 65, 45, 1915);
    			attr_dev(audio4, "data-key", "71");
    			if (audio4.src !== (audio4_src_value = "sounds/boom.wav")) attr_dev(audio4, "src", audio4_src_value);
    			add_location(audio4, file$2, 65, 2, 1872);
    			attr_dev(track5, "kind", "captions");
    			add_location(track5, file$2, 66, 45, 1992);
    			attr_dev(audio5, "data-key", "72");
    			if (audio5.src !== (audio5_src_value = "sounds/ride.wav")) attr_dev(audio5, "src", audio5_src_value);
    			add_location(audio5, file$2, 66, 2, 1949);
    			attr_dev(track6, "kind", "captions");
    			add_location(track6, file$2, 67, 46, 2070);
    			attr_dev(audio6, "data-key", "74");
    			if (audio6.src !== (audio6_src_value = "sounds/snare.wav")) attr_dev(audio6, "src", audio6_src_value);
    			add_location(audio6, file$2, 67, 2, 2026);
    			attr_dev(track7, "kind", "captions");
    			add_location(track7, file$2, 68, 44, 2146);
    			attr_dev(audio7, "data-key", "75");
    			if (audio7.src !== (audio7_src_value = "sounds/tom.wav")) attr_dev(audio7, "src", audio7_src_value);
    			add_location(audio7, file$2, 68, 2, 2104);
    			attr_dev(track8, "kind", "captions");
    			add_location(track8, file$2, 69, 45, 2223);
    			attr_dev(audio8, "data-key", "76");
    			if (audio8.src !== (audio8_src_value = "sounds/tink.wav")) attr_dev(audio8, "src", audio8_src_value);
    			add_location(audio8, file$2, 69, 2, 2180);
    			attr_dev(div11, "id", "day1");
    			attr_dev(div11, "class", "day-main svelte-1fvjhws");
    			add_location(div11, file$2, 20, 0, 503);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div10);
    			append_dev(div10, div0);
    			append_dev(div0, kbd0);
    			append_dev(div0, t1);
    			append_dev(div0, span0);
    			append_dev(div10, t3);
    			append_dev(div10, div1);
    			append_dev(div1, kbd1);
    			append_dev(div1, t5);
    			append_dev(div1, span1);
    			append_dev(div10, t7);
    			append_dev(div10, div2);
    			append_dev(div2, kbd2);
    			append_dev(div2, t9);
    			append_dev(div2, span2);
    			append_dev(div10, t11);
    			append_dev(div10, div3);
    			append_dev(div3, kbd3);
    			append_dev(div3, t13);
    			append_dev(div3, span3);
    			append_dev(div10, t15);
    			append_dev(div10, div4);
    			append_dev(div4, kbd4);
    			append_dev(div4, t17);
    			append_dev(div4, span4);
    			append_dev(div10, t19);
    			append_dev(div10, div5);
    			append_dev(div5, kbd5);
    			append_dev(div5, t21);
    			append_dev(div5, span5);
    			append_dev(div10, t23);
    			append_dev(div10, div6);
    			append_dev(div6, kbd6);
    			append_dev(div6, t25);
    			append_dev(div6, span6);
    			append_dev(div10, t27);
    			append_dev(div10, div7);
    			append_dev(div7, kbd7);
    			append_dev(div7, t29);
    			append_dev(div7, span7);
    			append_dev(div10, t31);
    			append_dev(div10, div8);
    			append_dev(div8, kbd8);
    			append_dev(div8, t33);
    			append_dev(div8, span8);
    			append_dev(div10, t35);
    			append_dev(div10, div9);
    			append_dev(div11, t36);
    			append_dev(div11, audio0);
    			append_dev(audio0, track0);
    			append_dev(div11, t37);
    			append_dev(div11, audio1);
    			append_dev(audio1, track1);
    			append_dev(div11, t38);
    			append_dev(div11, audio2);
    			append_dev(audio2, track2);
    			append_dev(div11, t39);
    			append_dev(div11, audio3);
    			append_dev(audio3, track3);
    			append_dev(div11, t40);
    			append_dev(div11, audio4);
    			append_dev(audio4, track4);
    			append_dev(div11, t41);
    			append_dev(div11, audio5);
    			append_dev(audio5, track5);
    			append_dev(div11, t42);
    			append_dev(div11, audio6);
    			append_dev(audio6, track6);
    			append_dev(div11, t43);
    			append_dev(div11, audio7);
    			append_dev(audio7, track7);
    			append_dev(div11, t44);
    			append_dev(div11, audio8);
    			append_dev(audio8, track8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function playSound(e) {
    	e.preventDefault();
    	const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`);
    	const key = document.querySelector(`div[data-key="${e.keyCode}"]`);
    	if (!audio) return;
    	key.classList.add("playing");
    	audio.currentTime = 0;
    	audio.play();

    	setTimeout(
    		() => {
    			key.classList.remove("playing");
    		},
    		100
    	);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayOne", slots, []);

    	onMount(async () => {
    		document.addEventListener("keydown", playSound);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayOne> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, playSound });
    	return [];
    }

    class DayOne extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayOne",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/day_files/DayTwo/DayTwo.svelte generated by Svelte v3.29.0 */
    const file$3 = "src/day_files/DayTwo/DayTwo.svelte";

    function create_fragment$3(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			attr_dev(div0, "class", "center");
    			add_location(div0, file$3, 44, 3, 1380);
    			attr_dev(div1, "class", "hand svelte-1hz06bk");
    			add_location(div1, file$3, 45, 3, 1410);
    			attr_dev(div2, "class", "hand min svelte-1hz06bk");
    			add_location(div2, file$3, 46, 3, 1463);
    			attr_dev(div3, "class", "hand hour svelte-1hz06bk");
    			add_location(div3, file$3, 47, 3, 1520);
    			attr_dev(div4, "class", "clock-face svelte-1hz06bk");
    			add_location(div4, file$3, 43, 2, 1352);
    			attr_dev(div5, "class", "clock svelte-1hz06bk");
    			add_location(div5, file$3, 42, 2, 1330);
    			attr_dev(div6, "class", "day-main svelte-1hz06bk");
    			add_location(div6, file$3, 41, 0, 1305);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			/*div1_binding*/ ctx[3](div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			/*div2_binding*/ ctx[4](div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			/*div3_binding*/ ctx[5](div3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			/*div1_binding*/ ctx[3](null);
    			/*div2_binding*/ ctx[4](null);
    			/*div3_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwo", slots, []);
    	let secondHand, minuteHand, hourHand;

    	function setDate() {
    		const now = new Date();
    		const seconds = now.getSeconds();
    		const minutes = now.getMinutes();
    		const hours = now.getHours();
    		const secondsDegrees = seconds / 60 * 360 + 90;
    		const minutesDegrees = minutes / 60 * 360 + 90;
    		const hoursDegrees = hours / 12 * 360 + 90;

    		if (seconds === 0) {
    			$$invalidate(0, secondHand.style.transition = "none", secondHand);
    		} else {
    			$$invalidate(0, secondHand.style.transition = "all 0.05s", secondHand);
    			$$invalidate(0, secondHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)", secondHand);
    		}

    		$$invalidate(0, secondHand.style.transform = `rotate(${secondsDegrees}deg)`, secondHand);

    		if (minutes === 0) {
    			$$invalidate(1, minuteHand.style.transition = "none", minuteHand);
    		} else {
    			$$invalidate(1, minuteHand.style.transition = "all 0.05s", minuteHand);
    			$$invalidate(1, minuteHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)", minuteHand);
    		}

    		$$invalidate(1, minuteHand.style.transform = `rotate(${minutesDegrees}deg)`, minuteHand);

    		if (hours === 0) {
    			$$invalidate(2, hourHand.style.transition = "none", hourHand);
    		} else {
    			$$invalidate(2, hourHand.style.transition = "all 0.05s", hourHand);
    			$$invalidate(2, hourHand.style.transitionTimingFunction = "cubic-bezier(0.1, 2.7, 0.58, 1)", hourHand);
    		}

    		$$invalidate(2, hourHand.style.transform = `rotate(${hoursDegrees}deg)`, hourHand);
    	}

    	const clockInterval = setInterval(setDate, 1000);
    	onDestroy(() => clearInterval(clockInterval));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwo> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			secondHand = $$value;
    			$$invalidate(0, secondHand);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			minuteHand = $$value;
    			$$invalidate(1, minuteHand);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			hourHand = $$value;
    			$$invalidate(2, hourHand);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onDestroy,
    		secondHand,
    		minuteHand,
    		hourHand,
    		setDate,
    		clockInterval
    	});

    	$$self.$inject_state = $$props => {
    		if ("secondHand" in $$props) $$invalidate(0, secondHand = $$props.secondHand);
    		if ("minuteHand" in $$props) $$invalidate(1, minuteHand = $$props.minuteHand);
    		if ("hourHand" in $$props) $$invalidate(2, hourHand = $$props.hourHand);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [secondHand, minuteHand, hourHand, div1_binding, div2_binding, div3_binding];
    }

    class DayTwo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwo",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/day_files/DayThree/DayThree.svelte generated by Svelte v3.29.0 */
    const file$4 = "src/day_files/DayThree/DayThree.svelte";

    function create_fragment$4(ctx) {
    	let div1;
    	let h2;
    	let t0;
    	let span;
    	let t2;
    	let div0;
    	let label0;
    	let t4;
    	let input0;
    	let t5;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let label2;
    	let t10;
    	let input2;
    	let t11;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			t0 = text("Update CSS Variables with ");
    			span = element("span");
    			span.textContent = "JS";
    			t2 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Spacing:";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Blur:";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Base Color";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			img = element("img");
    			attr_dev(span, "class", "hl svelte-1caz9an");
    			add_location(span, file$4, 20, 32, 541);
    			attr_dev(h2, "class", "svelte-1caz9an");
    			add_location(h2, file$4, 20, 2, 511);
    			attr_dev(label0, "for", "spacing");
    			attr_dev(label0, "class", "svelte-1caz9an");
    			add_location(label0, file$4, 23, 4, 624);
    			attr_dev(input0, "id", "spacing");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "name", "spacing");
    			attr_dev(input0, "min", "10");
    			attr_dev(input0, "max", "200");
    			input0.value = "10";
    			attr_dev(input0, "data-sizing", "px");
    			attr_dev(input0, "class", "svelte-1caz9an");
    			add_location(input0, file$4, 24, 4, 666);
    			attr_dev(label1, "for", "blur");
    			attr_dev(label1, "class", "svelte-1caz9an");
    			add_location(label1, file$4, 26, 4, 767);
    			attr_dev(input1, "id", "blur");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "name", "blur");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "25");
    			input1.value = "10";
    			attr_dev(input1, "data-sizing", "px");
    			attr_dev(input1, "class", "svelte-1caz9an");
    			add_location(input1, file$4, 27, 4, 803);
    			attr_dev(label2, "for", "base");
    			attr_dev(label2, "class", "svelte-1caz9an");
    			add_location(label2, file$4, 29, 4, 896);
    			attr_dev(input2, "id", "base");
    			attr_dev(input2, "type", "color");
    			attr_dev(input2, "name", "base");
    			input2.value = "#ffc600";
    			attr_dev(input2, "class", "svelte-1caz9an");
    			add_location(input2, file$4, 30, 4, 937);
    			attr_dev(div0, "class", "controls svelte-1caz9an");
    			add_location(div0, file$4, 22, 2, 576);
    			if (img.src !== (img_src_value = "https://source.unsplash.com/7bwQXzbF6KE/800x500")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1caz9an");
    			add_location(img, file$4, 33, 2, 1008);
    			attr_dev(div1, "class", "day-main svelte-1caz9an");
    			add_location(div1, file$4, 19, 0, 486);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t0);
    			append_dev(h2, span);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t4);
    			append_dev(div0, input0);
    			append_dev(div0, t5);
    			append_dev(div0, label1);
    			append_dev(div0, t7);
    			append_dev(div0, input1);
    			append_dev(div0, t8);
    			append_dev(div0, label2);
    			append_dev(div0, t10);
    			append_dev(div0, input2);
    			/*div0_binding*/ ctx[1](div0);
    			append_dev(div1, t11);
    			append_dev(div1, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*div0_binding*/ ctx[1](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleUpdate() {
    	const suffix = this.dataset.sizing || "";
    	document.documentElement.style.setProperty(`--${this.name}`, this.value + suffix);
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayThree", slots, []);
    	let controls;
    	let inputs = [];

    	onMount(() => {
    		inputs = controls.querySelectorAll("input");
    		inputs.forEach(input => input.addEventListener("change", handleUpdate));
    		inputs.forEach(input => input.addEventListener("mousemove", handleUpdate));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayThree> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			controls = $$value;
    			$$invalidate(0, controls);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, controls, inputs, handleUpdate });

    	$$self.$inject_state = $$props => {
    		if ("controls" in $$props) $$invalidate(0, controls = $$props.controls);
    		if ("inputs" in $$props) inputs = $$props.inputs;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [controls, div0_binding];
    }

    class DayThree extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayThree",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/day_files/DayFour/DayFour.svelte generated by Svelte v3.29.0 */

    const { console: console_1 } = globals;
    const file$5 = "src/day_files/DayFour/DayFour.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let p;
    	let em;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			em = element("em");
    			em.textContent = "Psst: have a look at the JavaScript Console";
    			t1 = text(" 💁");
    			add_location(em, file$5, 89, 4, 3803);
    			add_location(p, file$5, 89, 1, 3800);
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$5, 88, 0, 3776);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, em);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayFour", slots, []);

    	const inventors = [
    		{
    			first: "Albert",
    			last: "Einstein",
    			year: 1879,
    			passed: 1955
    		},
    		{
    			first: "Isaac",
    			last: "Newton",
    			year: 1643,
    			passed: 1727
    		},
    		{
    			first: "Galileo",
    			last: "Galilei",
    			year: 1564,
    			passed: 1642
    		},
    		{
    			first: "Marie",
    			last: "Curie",
    			year: 1867,
    			passed: 1934
    		},
    		{
    			first: "Johannes",
    			last: "Kepler",
    			year: 1571,
    			passed: 1630
    		},
    		{
    			first: "Nicolaus",
    			last: "Copernicus",
    			year: 1473,
    			passed: 1543
    		},
    		{
    			first: "Max",
    			last: "Planck",
    			year: 1858,
    			passed: 1947
    		},
    		{
    			first: "Katherine",
    			last: "Blodgett",
    			year: 1898,
    			passed: 1979
    		},
    		{
    			first: "Ada",
    			last: "Lovelace",
    			year: 1815,
    			passed: 1852
    		},
    		{
    			first: "Sarah E.",
    			last: "Goode",
    			year: 1855,
    			passed: 1905
    		},
    		{
    			first: "Lise",
    			last: "Meitner",
    			year: 1878,
    			passed: 1968
    		},
    		{
    			first: "Hanna",
    			last: "Hammarström",
    			year: 1829,
    			passed: 1909
    		}
    	];

    	const people = [
    		"Beck, Glenn",
    		"Becker, Carl",
    		"Beckett, Samuel",
    		"Beddoes, Mick",
    		"Beecher, Henry",
    		"Beethoven, Ludwig",
    		"Begin, Menachem",
    		"Belloc, Hilaire",
    		"Bellow, Saul",
    		"Benchley, Robert",
    		"Benenson, Peter",
    		"Ben-Gurion, David",
    		"Benjamin, Walter",
    		"Benn, Tony",
    		"Bennington, Chester",
    		"Benson, Leana",
    		"Bent, Silas",
    		"Bentsen, Lloyd",
    		"Berger, Ric",
    		"Bergman, Ingmar",
    		"Berio, Luciano",
    		"Berle, Milton",
    		"Berlin, Irving",
    		"Berne, Eric",
    		"Bernhard, Sandra",
    		"Berra, Yogi",
    		"Berry, Halle",
    		"Berry, Wendell",
    		"Bethea, Erin",
    		"Bevan, Aneurin",
    		"Bevel, Ken",
    		"Biden, Joseph",
    		"Bierce, Ambrose",
    		"Biko, Steve",
    		"Billings, Josh",
    		"Biondo, Frank",
    		"Birrell, Augustine",
    		"Black, Elk",
    		"Blair, Robert",
    		"Blair, Tony",
    		"Blake, William"
    	];

    	// Array.prototype.filter()
    	// 1. Filter the list of inventors for those who were born in the 1500's
    	const fifteen = inventors.filter(inventor => inventor.year >= 1500 && inventor.year < 1600);

    	console.table(fifteen);

    	// Array.prototype.map()
    	// 2. Give us an array of the inventors first and last names
    	const fullnames = inventors.map(inventor => `${inventor.first} ${inventor.last}`);

    	console.log(fullnames);

    	// Array.prototype.sort()
    	// 3. Sort the inventors by birthdate, oldest to youngest
    	const sortByBirth = inventors.sort((a, b) => a.year > b.year ? 1 : -1);

    	console.log(sortByBirth);

    	// Array.prototype.reduce()
    	// 4. How many years did all the inventors live all together?
    	const fullLifespans = inventors.reduce(
    		(total, inventor) => {
    			return total += inventor.passed - inventor.year;
    		},
    		0
    	);

    	console.log(fullLifespans);

    	// 5. Sort the inventors by years lived
    	const oldest = inventors.sort((a, b) => {
    		const lastGuy = a.passed - a.year;
    		const newGuy = b.passed - b.year;
    		return lastGuy > newGuy ? -1 : 1;
    	});

    	console.log(oldest);

    	// 6. create a list of Boulevards in Paris that contain 'de' anywhere in the name
    	// https://en.wikipedia.org/wiki/Category:Boulevards_in_Paris
    	// const category = document.querySelector('.mw-category');
    	// const links = Array.from(category.querySelectorAll('a'));
    	// const de = links
    	// 								.map((link) => link.text)
    	// 								.filter(streetName => streetName.includes('de'));
    	// 7. sort Exercise
    	// Sort the people alphabetically by last name
    	const alpha = people.sort((a, b) => {
    		const [aLast, aFirst] = a.split(", ");
    		const [bLast, bFirst] = b.split(", ");
    		return aLast > bLast ? 1 : -1;
    	});

    	console.log(alpha);

    	// 8. Reduce Exercise
    	// Sum up the instances of each of these
    	const data = [
    		"car",
    		"car",
    		"truck",
    		"truck",
    		"bike",
    		"walk",
    		"car",
    		"van",
    		"bike",
    		"walk",
    		"car",
    		"van",
    		"car",
    		"truck"
    	];

    	const transportation = data.reduce(
    		(obj, item) => {
    			if (!obj[item]) obj[item] = 0;
    			obj[item]++;
    			return obj;
    		},
    		{}
    	);

    	console.log(transportation);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<DayFour> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		inventors,
    		people,
    		fifteen,
    		fullnames,
    		sortByBirth,
    		fullLifespans,
    		oldest,
    		alpha,
    		data,
    		transportation
    	});

    	return [];
    }

    class DayFour extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayFour",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/day_files/DayFive/DayFive.svelte generated by Svelte v3.29.0 */
    const file$6 = "src/day_files/DayFive/DayFive.svelte";

    function create_fragment$6(ctx) {
    	let div7;
    	let div5;
    	let div0;
    	let p0;
    	let t1;
    	let p1;
    	let t3;
    	let p2;
    	let t5;
    	let div1;
    	let p3;
    	let t7;
    	let p4;
    	let t9;
    	let p5;
    	let t11;
    	let div2;
    	let p6;
    	let t13;
    	let p7;
    	let t15;
    	let p8;
    	let t17;
    	let div3;
    	let p9;
    	let t19;
    	let p10;
    	let t21;
    	let p11;
    	let t23;
    	let div4;
    	let p12;
    	let t25;
    	let p13;
    	let t27;
    	let p14;
    	let t29;
    	let div6;
    	let p15;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Hey";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "Let's";
    			t3 = space();
    			p2 = element("p");
    			p2.textContent = "Dance";
    			t5 = space();
    			div1 = element("div");
    			p3 = element("p");
    			p3.textContent = "Give";
    			t7 = space();
    			p4 = element("p");
    			p4.textContent = "Take";
    			t9 = space();
    			p5 = element("p");
    			p5.textContent = "Receive";
    			t11 = space();
    			div2 = element("div");
    			p6 = element("p");
    			p6.textContent = "Experience";
    			t13 = space();
    			p7 = element("p");
    			p7.textContent = "It";
    			t15 = space();
    			p8 = element("p");
    			p8.textContent = "Today";
    			t17 = space();
    			div3 = element("div");
    			p9 = element("p");
    			p9.textContent = "Give";
    			t19 = space();
    			p10 = element("p");
    			p10.textContent = "All";
    			t21 = space();
    			p11 = element("p");
    			p11.textContent = "You can";
    			t23 = space();
    			div4 = element("div");
    			p12 = element("p");
    			p12.textContent = "Life";
    			t25 = space();
    			p13 = element("p");
    			p13.textContent = "In";
    			t27 = space();
    			p14 = element("p");
    			p14.textContent = "Motion";
    			t29 = space();
    			div6 = element("div");
    			p15 = element("p");
    			attr_dev(p0, "class", "svelte-2rfq8x");
    			add_location(p0, file$6, 24, 6, 563);
    			attr_dev(p1, "class", "svelte-2rfq8x");
    			add_location(p1, file$6, 25, 6, 580);
    			attr_dev(p2, "class", "svelte-2rfq8x");
    			add_location(p2, file$6, 26, 6, 599);
    			attr_dev(div0, "class", "panel panel1 svelte-2rfq8x");
    			add_location(div0, file$6, 23, 4, 530);
    			attr_dev(p3, "class", "svelte-2rfq8x");
    			add_location(p3, file$6, 29, 6, 660);
    			attr_dev(p4, "class", "svelte-2rfq8x");
    			add_location(p4, file$6, 30, 6, 678);
    			attr_dev(p5, "class", "svelte-2rfq8x");
    			add_location(p5, file$6, 31, 6, 696);
    			attr_dev(div1, "class", "panel panel2 svelte-2rfq8x");
    			add_location(div1, file$6, 28, 4, 627);
    			attr_dev(p6, "class", "svelte-2rfq8x");
    			add_location(p6, file$6, 34, 6, 759);
    			attr_dev(p7, "class", "svelte-2rfq8x");
    			add_location(p7, file$6, 35, 6, 783);
    			attr_dev(p8, "class", "svelte-2rfq8x");
    			add_location(p8, file$6, 36, 6, 799);
    			attr_dev(div2, "class", "panel panel3 svelte-2rfq8x");
    			add_location(div2, file$6, 33, 4, 726);
    			attr_dev(p9, "class", "svelte-2rfq8x");
    			add_location(p9, file$6, 39, 6, 860);
    			attr_dev(p10, "class", "svelte-2rfq8x");
    			add_location(p10, file$6, 40, 6, 878);
    			attr_dev(p11, "class", "svelte-2rfq8x");
    			add_location(p11, file$6, 41, 6, 895);
    			attr_dev(div3, "class", "panel panel4 svelte-2rfq8x");
    			add_location(div3, file$6, 38, 4, 827);
    			attr_dev(p12, "class", "svelte-2rfq8x");
    			add_location(p12, file$6, 44, 6, 958);
    			attr_dev(p13, "class", "svelte-2rfq8x");
    			add_location(p13, file$6, 45, 6, 976);
    			attr_dev(p14, "class", "svelte-2rfq8x");
    			add_location(p14, file$6, 46, 6, 992);
    			attr_dev(div4, "class", "panel panel5 svelte-2rfq8x");
    			add_location(div4, file$6, 43, 4, 925);
    			attr_dev(div5, "class", "panels svelte-2rfq8x");
    			add_location(div5, file$6, 22, 2, 505);
    			attr_dev(p15, "class", "svelte-2rfq8x");
    			add_location(p15, file$6, 50, 42, 1069);
    			attr_dev(div6, "class", "hide panel open open-active svelte-2rfq8x");
    			add_location(div6, file$6, 50, 1, 1028);
    			attr_dev(div7, "class", "day-main svelte-2rfq8x");
    			add_location(div7, file$6, 21, 0, 480);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div5);
    			append_dev(div5, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(div0, t3);
    			append_dev(div0, p2);
    			append_dev(div5, t5);
    			append_dev(div5, div1);
    			append_dev(div1, p3);
    			append_dev(div1, t7);
    			append_dev(div1, p4);
    			append_dev(div1, t9);
    			append_dev(div1, p5);
    			append_dev(div5, t11);
    			append_dev(div5, div2);
    			append_dev(div2, p6);
    			append_dev(div2, t13);
    			append_dev(div2, p7);
    			append_dev(div2, t15);
    			append_dev(div2, p8);
    			append_dev(div5, t17);
    			append_dev(div5, div3);
    			append_dev(div3, p9);
    			append_dev(div3, t19);
    			append_dev(div3, p10);
    			append_dev(div3, t21);
    			append_dev(div3, p11);
    			append_dev(div5, t23);
    			append_dev(div5, div4);
    			append_dev(div4, p12);
    			append_dev(div4, t25);
    			append_dev(div4, p13);
    			append_dev(div4, t27);
    			append_dev(div4, p14);
    			append_dev(div7, t29);
    			append_dev(div7, div6);
    			append_dev(div6, p15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toggleOpen(e) {
    	e.target.classList.toggle("open");
    }

    function toggleActive(e) {
    	if (e.propertyName.includes("flex")) {
    		e.target.classList.toggle("open-active");
    	}
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayFive", slots, []);

    	onMount(() => {
    		let panels = document.querySelectorAll(".panel");
    		panels.forEach(panel => panel.addEventListener("click", toggleOpen));
    		panels.forEach(panel => panel.addEventListener("transitionend", toggleActive));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayFive> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, toggleOpen, toggleActive });
    	return [];
    }

    class DayFive extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayFive",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/day_files/DaySix/DaySix.svelte generated by Svelte v3.29.0 */

    const file$7 = "src/day_files/DaySix/DaySix.svelte";

    function create_fragment$7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Six";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$7, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DaySix", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DaySix> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DaySix extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DaySix",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/day_files/DaySeven/DaySeven.svelte generated by Svelte v3.29.0 */

    const file$8 = "src/day_files/DaySeven/DaySeven.svelte";

    function create_fragment$8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Seven";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$8, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DaySeven", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DaySeven> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DaySeven extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DaySeven",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/day_files/DayEight/DayEight.svelte generated by Svelte v3.29.0 */

    const file$9 = "src/day_files/DayEight/DayEight.svelte";

    function create_fragment$9(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Eight";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$9, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayEight", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayEight> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayEight extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayEight",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/day_files/DayNine/DayNine.svelte generated by Svelte v3.29.0 */

    const file$a = "src/day_files/DayNine/DayNine.svelte";

    function create_fragment$a(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Nine";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$a, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayNine", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayNine> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayNine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayNine",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/day_files/DayTen/DayTen.svelte generated by Svelte v3.29.0 */

    const file$b = "src/day_files/DayTen/DayTen.svelte";

    function create_fragment$b(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Ten";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$b, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTen",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/day_files/DayEleven/DayEleven.svelte generated by Svelte v3.29.0 */

    const file$c = "src/day_files/DayEleven/DayEleven.svelte";

    function create_fragment$c(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Eleven";
    			attr_dev(div, "class", "day-main svelte-uv5s0j");
    			add_location(div, file$c, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayEleven", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayEleven> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayEleven extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayEleven",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/day_files/DayTwelve/DayTwelve.svelte generated by Svelte v3.29.0 */

    const file$d = "src/day_files/DayTwelve/DayTwelve.svelte";

    function create_fragment$d(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twelve";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$d, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwelve", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwelve> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwelve extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwelve",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/day_files/DayThirteen/DayThirteen.svelte generated by Svelte v3.29.0 */

    const file$e = "src/day_files/DayThirteen/DayThirteen.svelte";

    function create_fragment$e(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Thirteen";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$e, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayThirteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayThirteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayThirteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayThirteen",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/day_files/DayFourteen/DayFourteen.svelte generated by Svelte v3.29.0 */

    const file$f = "src/day_files/DayFourteen/DayFourteen.svelte";

    function create_fragment$f(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Fourteen";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$f, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayFourteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayFourteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayFourteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayFourteen",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/day_files/DayFifteen/DayFifteen.svelte generated by Svelte v3.29.0 */

    const file$g = "src/day_files/DayFifteen/DayFifteen.svelte";

    function create_fragment$g(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Fifteen";
    			attr_dev(div, "class", "day-main svelte-uv5s0j");
    			add_location(div, file$g, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayFifteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayFifteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayFifteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayFifteen",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/day_files/DaySixteen/DaySixteen.svelte generated by Svelte v3.29.0 */

    const file$h = "src/day_files/DaySixteen/DaySixteen.svelte";

    function create_fragment$h(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Sixteen";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$h, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DaySixteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DaySixteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DaySixteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DaySixteen",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/day_files/DaySeventeen/DaySeventeen.svelte generated by Svelte v3.29.0 */

    const file$i = "src/day_files/DaySeventeen/DaySeventeen.svelte";

    function create_fragment$i(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Seventeen";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$i, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DaySeventeen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DaySeventeen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DaySeventeen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DaySeventeen",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/day_files/DayEighteen/DayEighteen.svelte generated by Svelte v3.29.0 */

    const file$j = "src/day_files/DayEighteen/DayEighteen.svelte";

    function create_fragment$j(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Eighteen";
    			attr_dev(div, "class", "day-main svelte-uv5s0j");
    			add_location(div, file$j, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayEighteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayEighteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayEighteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayEighteen",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/day_files/DayNineteen/DayNineteen.svelte generated by Svelte v3.29.0 */

    const file$k = "src/day_files/DayNineteen/DayNineteen.svelte";

    function create_fragment$k(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Nineteen";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$k, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayNineteen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayNineteen> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayNineteen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayNineteen",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/day_files/DayTwenty/DayTwenty.svelte generated by Svelte v3.29.0 */

    const file$l = "src/day_files/DayTwenty/DayTwenty.svelte";

    function create_fragment$l(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$l, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwenty", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwenty> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwenty extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwenty",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/day_files/DayTwentyOne/DayTwentyOne.svelte generated by Svelte v3.29.0 */

    const file$m = "src/day_files/DayTwentyOne/DayTwentyOne.svelte";

    function create_fragment$m(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty One";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$m, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyOne", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyOne> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyOne extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyOne",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/day_files/DayTwentyTwo/DayTwentyTwo.svelte generated by Svelte v3.29.0 */

    const file$n = "src/day_files/DayTwentyTwo/DayTwentyTwo.svelte";

    function create_fragment$n(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Two";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$n, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyTwo", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyTwo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyTwo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyTwo",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src/day_files/DayTwentyThree/DayTwentyThree.svelte generated by Svelte v3.29.0 */

    const file$o = "src/day_files/DayTwentyThree/DayTwentyThree.svelte";

    function create_fragment$o(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Three";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$o, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyThree", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyThree> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyThree extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyThree",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src/day_files/DayTwentyFour/DayTwentyFour.svelte generated by Svelte v3.29.0 */

    const file$p = "src/day_files/DayTwentyFour/DayTwentyFour.svelte";

    function create_fragment$p(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Four";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$p, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyFour", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyFour> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyFour extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyFour",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src/day_files/DayTwentyFive/DayTwentyFive.svelte generated by Svelte v3.29.0 */

    const file$q = "src/day_files/DayTwentyFive/DayTwentyFive.svelte";

    function create_fragment$q(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Five";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$q, 5, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyFive", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyFive> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyFive extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyFive",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src/day_files/DayTwentySix/DayTwentySix.svelte generated by Svelte v3.29.0 */

    const file$r = "src/day_files/DayTwentySix/DayTwentySix.svelte";

    function create_fragment$r(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Six";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$r, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentySix", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentySix> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentySix extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentySix",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src/day_files/DayTwentySeven/DayTwentySeven.svelte generated by Svelte v3.29.0 */

    const file$s = "src/day_files/DayTwentySeven/DayTwentySeven.svelte";

    function create_fragment$s(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Seven";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$s, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentySeven", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentySeven> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentySeven extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentySeven",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src/day_files/DayTwentyEight/DayTwentyEight.svelte generated by Svelte v3.29.0 */

    const file$t = "src/day_files/DayTwentyEight/DayTwentyEight.svelte";

    function create_fragment$t(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Eight";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$t, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyEight", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyEight> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyEight extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyEight",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    /* src/day_files/DayTwentyNine/DayTwentyNine.svelte generated by Svelte v3.29.0 */

    const file$u = "src/day_files/DayTwentyNine/DayTwentyNine.svelte";

    function create_fragment$u(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Twenty Nine";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$u, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayTwentyNine", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayTwentyNine> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayTwentyNine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayTwentyNine",
    			options,
    			id: create_fragment$u.name
    		});
    	}
    }

    /* src/day_files/DayThirty/DayThirty.svelte generated by Svelte v3.29.0 */

    const file$v = "src/day_files/DayThirty/DayThirty.svelte";

    function create_fragment$v(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Day Thirty";
    			attr_dev(div, "class", "day-main svelte-1t7hos2");
    			add_location(div, file$v, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$v($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DayThirty", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DayThirty> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class DayThirty extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DayThirty",
    			options,
    			id: create_fragment$v.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.0 */
    const file$w = "src/App.svelte";

    // (62:2) {#if isModalOpen}
    function create_if_block_31(ctx) {
    	let modal;
    	let current;
    	modal = new Modal({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_31.name,
    		type: "if",
    		source: "(62:2) {#if isModalOpen}",
    		ctx
    	});

    	return block;
    }

    // (186:28) 
    function create_if_block_30(ctx) {
    	let div;
    	let daythirty;
    	let current;
    	daythirty = new DayThirty({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daythirty.$$.fragment);
    			attr_dev(div, "id", "30");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 186, 3, 5456);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daythirty, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daythirty.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daythirty.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daythirty);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_30.name,
    		type: "if",
    		source: "(186:28) ",
    		ctx
    	});

    	return block;
    }

    // (182:28) 
    function create_if_block_29(ctx) {
    	let div;
    	let daytwentynine;
    	let current;
    	daytwentynine = new DayTwentyNine({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentynine.$$.fragment);
    			attr_dev(div, "id", "29");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 182, 3, 5365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentynine, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentynine.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentynine.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentynine);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_29.name,
    		type: "if",
    		source: "(182:28) ",
    		ctx
    	});

    	return block;
    }

    // (178:28) 
    function create_if_block_28(ctx) {
    	let div;
    	let daytwentyeight;
    	let current;
    	daytwentyeight = new DayTwentyEight({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentyeight.$$.fragment);
    			attr_dev(div, "id", "28");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 178, 3, 5273);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentyeight, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentyeight.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentyeight.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentyeight);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_28.name,
    		type: "if",
    		source: "(178:28) ",
    		ctx
    	});

    	return block;
    }

    // (174:28) 
    function create_if_block_27(ctx) {
    	let div;
    	let daytwentyseven;
    	let current;
    	daytwentyseven = new DayTwentySeven({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentyseven.$$.fragment);
    			attr_dev(div, "id", "27");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 174, 3, 5181);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentyseven, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentyseven.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentyseven.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentyseven);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_27.name,
    		type: "if",
    		source: "(174:28) ",
    		ctx
    	});

    	return block;
    }

    // (170:28) 
    function create_if_block_26(ctx) {
    	let div;
    	let daytwentysix;
    	let current;
    	daytwentysix = new DayTwentySix({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentysix.$$.fragment);
    			attr_dev(div, "id", "26");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 170, 3, 5091);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentysix, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentysix.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentysix.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentysix);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_26.name,
    		type: "if",
    		source: "(170:28) ",
    		ctx
    	});

    	return block;
    }

    // (166:28) 
    function create_if_block_25(ctx) {
    	let div;
    	let daytwentyfive;
    	let current;
    	daytwentyfive = new DayTwentyFive({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentyfive.$$.fragment);
    			attr_dev(div, "id", "25");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 166, 3, 5000);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentyfive, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentyfive.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentyfive.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentyfive);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_25.name,
    		type: "if",
    		source: "(166:28) ",
    		ctx
    	});

    	return block;
    }

    // (162:28) 
    function create_if_block_24(ctx) {
    	let div;
    	let daytwentyfour;
    	let current;
    	daytwentyfour = new DayTwentyFour({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentyfour.$$.fragment);
    			attr_dev(div, "id", "24");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 162, 3, 4909);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentyfour, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentyfour.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentyfour.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentyfour);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_24.name,
    		type: "if",
    		source: "(162:28) ",
    		ctx
    	});

    	return block;
    }

    // (158:28) 
    function create_if_block_23(ctx) {
    	let div;
    	let daytwentythree;
    	let current;
    	daytwentythree = new DayTwentyThree({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentythree.$$.fragment);
    			attr_dev(div, "id", "23");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 158, 3, 4817);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentythree, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentythree.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentythree.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentythree);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_23.name,
    		type: "if",
    		source: "(158:28) ",
    		ctx
    	});

    	return block;
    }

    // (154:28) 
    function create_if_block_22(ctx) {
    	let div;
    	let daytwentytwo;
    	let current;
    	daytwentytwo = new DayTwentyTwo({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentytwo.$$.fragment);
    			attr_dev(div, "id", "22");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 154, 3, 4727);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentytwo, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentytwo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentytwo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentytwo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_22.name,
    		type: "if",
    		source: "(154:28) ",
    		ctx
    	});

    	return block;
    }

    // (150:28) 
    function create_if_block_21(ctx) {
    	let div;
    	let daytwentyone;
    	let current;
    	daytwentyone = new DayTwentyOne({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwentyone.$$.fragment);
    			attr_dev(div, "id", "21");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 150, 3, 4637);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwentyone, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwentyone.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwentyone.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwentyone);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_21.name,
    		type: "if",
    		source: "(150:28) ",
    		ctx
    	});

    	return block;
    }

    // (146:28) 
    function create_if_block_20(ctx) {
    	let div;
    	let daytwenty;
    	let current;
    	daytwenty = new DayTwenty({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwenty.$$.fragment);
    			attr_dev(div, "id", "20");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 146, 3, 4550);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwenty, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwenty.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwenty.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwenty);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_20.name,
    		type: "if",
    		source: "(146:28) ",
    		ctx
    	});

    	return block;
    }

    // (142:28) 
    function create_if_block_19(ctx) {
    	let div;
    	let daynineteen;
    	let current;
    	daynineteen = new DayNineteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daynineteen.$$.fragment);
    			attr_dev(div, "id", "19");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 142, 3, 4461);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daynineteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daynineteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daynineteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daynineteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(142:28) ",
    		ctx
    	});

    	return block;
    }

    // (138:28) 
    function create_if_block_18(ctx) {
    	let div;
    	let dayeighteen;
    	let current;
    	dayeighteen = new DayEighteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayeighteen.$$.fragment);
    			attr_dev(div, "id", "18");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 138, 3, 4372);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayeighteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayeighteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayeighteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayeighteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(138:28) ",
    		ctx
    	});

    	return block;
    }

    // (134:28) 
    function create_if_block_17(ctx) {
    	let div;
    	let dayseventeen;
    	let current;
    	dayseventeen = new DaySeventeen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayseventeen.$$.fragment);
    			attr_dev(div, "id", "17");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 134, 3, 4282);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayseventeen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayseventeen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayseventeen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayseventeen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(134:28) ",
    		ctx
    	});

    	return block;
    }

    // (130:28) 
    function create_if_block_16(ctx) {
    	let div;
    	let daysixteen;
    	let current;
    	daysixteen = new DaySixteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daysixteen.$$.fragment);
    			attr_dev(div, "id", "16");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 130, 3, 4194);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daysixteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daysixteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daysixteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daysixteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(130:28) ",
    		ctx
    	});

    	return block;
    }

    // (126:28) 
    function create_if_block_15(ctx) {
    	let div;
    	let dayfifteen;
    	let current;
    	dayfifteen = new DayFifteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayfifteen.$$.fragment);
    			attr_dev(div, "id", "15");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 126, 3, 4106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayfifteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayfifteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayfifteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayfifteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(126:28) ",
    		ctx
    	});

    	return block;
    }

    // (122:28) 
    function create_if_block_14(ctx) {
    	let div;
    	let dayfourteen;
    	let current;
    	dayfourteen = new DayFourteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayfourteen.$$.fragment);
    			attr_dev(div, "id", "14");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 122, 3, 4017);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayfourteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayfourteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayfourteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayfourteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(122:28) ",
    		ctx
    	});

    	return block;
    }

    // (118:28) 
    function create_if_block_13(ctx) {
    	let div;
    	let daythirteen;
    	let current;
    	daythirteen = new DayThirteen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daythirteen.$$.fragment);
    			attr_dev(div, "id", "13");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 118, 3, 3928);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daythirteen, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daythirteen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daythirteen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daythirteen);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(118:28) ",
    		ctx
    	});

    	return block;
    }

    // (114:28) 
    function create_if_block_12(ctx) {
    	let div;
    	let daytwelve;
    	let current;
    	daytwelve = new DayTwelve({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwelve.$$.fragment);
    			attr_dev(div, "id", "12");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 114, 3, 3841);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwelve, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwelve.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwelve.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwelve);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(114:28) ",
    		ctx
    	});

    	return block;
    }

    // (110:28) 
    function create_if_block_11(ctx) {
    	let div;
    	let dayeleven;
    	let current;
    	dayeleven = new DayEleven({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayeleven.$$.fragment);
    			attr_dev(div, "id", "11");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 110, 3, 3754);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayeleven, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayeleven.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayeleven.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayeleven);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(110:28) ",
    		ctx
    	});

    	return block;
    }

    // (106:28) 
    function create_if_block_10(ctx) {
    	let div;
    	let dayten;
    	let current;
    	dayten = new DayTen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayten.$$.fragment);
    			attr_dev(div, "id", "10");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 106, 3, 3670);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayten, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayten.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayten.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayten);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(106:28) ",
    		ctx
    	});

    	return block;
    }

    // (102:27) 
    function create_if_block_9(ctx) {
    	let div;
    	let daynine;
    	let current;
    	daynine = new DayNine({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daynine.$$.fragment);
    			attr_dev(div, "id", "9");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 102, 3, 3586);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daynine, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daynine.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daynine.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daynine);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(102:27) ",
    		ctx
    	});

    	return block;
    }

    // (98:27) 
    function create_if_block_8(ctx) {
    	let div;
    	let dayeight;
    	let current;
    	dayeight = new DayEight({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayeight.$$.fragment);
    			attr_dev(div, "id", "8");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 98, 3, 3502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayeight, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayeight.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayeight.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayeight);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(98:27) ",
    		ctx
    	});

    	return block;
    }

    // (94:27) 
    function create_if_block_7(ctx) {
    	let div;
    	let dayseven;
    	let current;
    	dayseven = new DaySeven({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayseven.$$.fragment);
    			attr_dev(div, "id", "7");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 94, 3, 3418);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayseven, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayseven.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayseven.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayseven);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(94:27) ",
    		ctx
    	});

    	return block;
    }

    // (90:27) 
    function create_if_block_6(ctx) {
    	let div;
    	let daysix;
    	let current;
    	daysix = new DaySix({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daysix.$$.fragment);
    			attr_dev(div, "id", "6");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 90, 3, 3336);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daysix, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daysix.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daysix.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daysix);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(90:27) ",
    		ctx
    	});

    	return block;
    }

    // (86:27) 
    function create_if_block_5(ctx) {
    	let div;
    	let dayfive;
    	let current;
    	dayfive = new DayFive({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayfive.$$.fragment);
    			attr_dev(div, "id", "5");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 86, 3, 3253);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayfive, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayfive.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayfive.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayfive);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(86:27) ",
    		ctx
    	});

    	return block;
    }

    // (82:27) 
    function create_if_block_4(ctx) {
    	let div;
    	let dayfour;
    	let current;
    	dayfour = new DayFour({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayfour.$$.fragment);
    			attr_dev(div, "id", "4");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 82, 3, 3170);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayfour, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayfour.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayfour.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayfour);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(82:27) ",
    		ctx
    	});

    	return block;
    }

    // (78:27) 
    function create_if_block_3(ctx) {
    	let div;
    	let daythree;
    	let current;
    	daythree = new DayThree({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daythree.$$.fragment);
    			attr_dev(div, "id", "3");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 78, 3, 3086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daythree, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daythree.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daythree.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daythree);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(78:27) ",
    		ctx
    	});

    	return block;
    }

    // (74:27) 
    function create_if_block_2(ctx) {
    	let div;
    	let daytwo;
    	let current;
    	daytwo = new DayTwo({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(daytwo.$$.fragment);
    			attr_dev(div, "id", "2");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 74, 3, 3004);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(daytwo, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daytwo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daytwo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daytwo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(74:27) ",
    		ctx
    	});

    	return block;
    }

    // (70:27) 
    function create_if_block_1(ctx) {
    	let div;
    	let dayone;
    	let current;
    	dayone = new DayOne({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(dayone.$$.fragment);
    			attr_dev(div, "id", "1");
    			attr_dev(div, "class", "page");
    			add_location(div, file$w, 70, 3, 2922);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(dayone, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dayone.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dayone.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(dayone);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(70:27) ",
    		ctx
    	});

    	return block;
    }

    // (66:3) {#if pageNum === 0}
    function create_if_block(ctx) {
    	let div;
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(home.$$.fragment);
    			attr_dev(div, "id", "home");
    			attr_dev(div, "class", "page svelte-1ltc0s1");
    			add_location(div, file$w, 66, 3, 2839);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(home, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(home);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(66:3) {#if pageNum === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$w(ctx) {
    	let script;
    	let script_src_value;
    	let t0;
    	let main;
    	let p;
    	let t2;
    	let span;
    	let t3;
    	let div1;
    	let t4;
    	let div0;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isModalOpen*/ ctx[1] && create_if_block_31(ctx);

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_if_block_5,
    		create_if_block_6,
    		create_if_block_7,
    		create_if_block_8,
    		create_if_block_9,
    		create_if_block_10,
    		create_if_block_11,
    		create_if_block_12,
    		create_if_block_13,
    		create_if_block_14,
    		create_if_block_15,
    		create_if_block_16,
    		create_if_block_17,
    		create_if_block_18,
    		create_if_block_19,
    		create_if_block_20,
    		create_if_block_21,
    		create_if_block_22,
    		create_if_block_23,
    		create_if_block_24,
    		create_if_block_25,
    		create_if_block_26,
    		create_if_block_27,
    		create_if_block_28,
    		create_if_block_29,
    		create_if_block_30
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*pageNum*/ ctx[0] === 0) return 0;
    		if (/*pageNum*/ ctx[0] === 1) return 1;
    		if (/*pageNum*/ ctx[0] === 2) return 2;
    		if (/*pageNum*/ ctx[0] === 3) return 3;
    		if (/*pageNum*/ ctx[0] === 4) return 4;
    		if (/*pageNum*/ ctx[0] === 5) return 5;
    		if (/*pageNum*/ ctx[0] === 6) return 6;
    		if (/*pageNum*/ ctx[0] === 7) return 7;
    		if (/*pageNum*/ ctx[0] === 8) return 8;
    		if (/*pageNum*/ ctx[0] === 9) return 9;
    		if (/*pageNum*/ ctx[0] === 10) return 10;
    		if (/*pageNum*/ ctx[0] === 11) return 11;
    		if (/*pageNum*/ ctx[0] === 12) return 12;
    		if (/*pageNum*/ ctx[0] === 13) return 13;
    		if (/*pageNum*/ ctx[0] === 14) return 14;
    		if (/*pageNum*/ ctx[0] === 15) return 15;
    		if (/*pageNum*/ ctx[0] === 16) return 16;
    		if (/*pageNum*/ ctx[0] === 17) return 17;
    		if (/*pageNum*/ ctx[0] === 18) return 18;
    		if (/*pageNum*/ ctx[0] === 19) return 19;
    		if (/*pageNum*/ ctx[0] === 20) return 20;
    		if (/*pageNum*/ ctx[0] === 21) return 21;
    		if (/*pageNum*/ ctx[0] === 22) return 22;
    		if (/*pageNum*/ ctx[0] === 23) return 23;
    		if (/*pageNum*/ ctx[0] === 24) return 24;
    		if (/*pageNum*/ ctx[0] === 25) return 25;
    		if (/*pageNum*/ ctx[0] === 26) return 26;
    		if (/*pageNum*/ ctx[0] === 27) return 27;
    		if (/*pageNum*/ ctx[0] === 28) return 28;
    		if (/*pageNum*/ ctx[0] === 29) return 29;
    		if (/*pageNum*/ ctx[0] === 30) return 30;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			script = element("script");
    			t0 = space();
    			main = element("main");
    			p = element("p");
    			p.textContent = "30 Days Of Javascript";
    			t2 = space();
    			span = element("span");
    			t3 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			if (script.src !== (script_src_value = "https://kit.fontawesome.com/a229c5b13d.js")) attr_dev(script, "src", script_src_value);
    			attr_dev(script, "crossorigin", "anonymous");
    			add_location(script, file$w, 55, 1, 2511);
    			attr_dev(p, "class", "svelte-1ltc0s1");
    			add_location(p, file$w, 58, 1, 2624);
    			attr_dev(span, "class", "menu fas fa-bars svelte-1ltc0s1");
    			add_location(span, file$w, 59, 1, 2654);
    			attr_dev(div0, "class", "pages svelte-1ltc0s1");
    			add_location(div0, file$w, 64, 2, 2793);
    			attr_dev(div1, "class", "main-section svelte-1ltc0s1");
    			add_location(div1, file$w, 60, 1, 2723);
    			attr_dev(main, "class", "svelte-1ltc0s1");
    			add_location(main, file$w, 57, 0, 2616);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, script);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, p);
    			append_dev(main, t2);
    			append_dev(main, span);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t4);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isModalOpen*/ ctx[1]) {
    				if (if_block0) {
    					if (dirty & /*isModalOpen*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_31(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, t4);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block1) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block1 = if_blocks[current_block_type_index];

    					if (!if_block1) {
    						if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block1.c();
    					}

    					transition_in(if_block1, 1);
    					if_block1.m(div0, null);
    				} else {
    					if_block1 = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(script);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let pageNum = 0;
    	let isModalOpen = false;

    	const unsubscribe = modalOpen.subscribe(value => {
    		$$invalidate(1, isModalOpen = value);
    	});

    	const unsubscribeTwo = page.subscribe(value => {
    		$$invalidate(0, pageNum = value);
    	});

    	function openModal(e) {
    		e.preventDefault();
    		modalOpen.update(n => n = !n);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => openModal(e);

    	$$self.$capture_state = () => ({
    		days,
    		Modal,
    		Home,
    		DayOne,
    		DayTwo,
    		DayThree,
    		DayFour,
    		DayFive,
    		DaySix,
    		DaySeven,
    		DayEight,
    		DayNine,
    		DayTen,
    		DayEleven,
    		DayTwelve,
    		DayThirteen,
    		DayFourteen,
    		DayFifteen,
    		DaySixteen,
    		DaySeventeen,
    		DayEighteen,
    		DayNineteen,
    		DayTwenty,
    		DayTwentyOne,
    		DayTwentyTwo,
    		DayTwentyThree,
    		DayTwentyFour,
    		DayTwentyFive,
    		DayTwentySix,
    		DayTwentySeven,
    		DayTwentyEight,
    		DayTwentyNine,
    		DayThirty,
    		page,
    		modalOpen,
    		pageNum,
    		isModalOpen,
    		unsubscribe,
    		unsubscribeTwo,
    		openModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("pageNum" in $$props) $$invalidate(0, pageNum = $$props.pageNum);
    		if ("isModalOpen" in $$props) $$invalidate(1, isModalOpen = $$props.isModalOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pageNum, isModalOpen, openModal, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$w.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
