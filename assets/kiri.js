
// jshint esversion:6

var commit1;
var commit2;

var old_view;
var current_view;

current_diff_filter = "diff" // diff or normal
var zoom_filter_restore_timer = null;
var zoom_filters_suspended = false;
var last_transform_zoom = null;

var panZoom_instance = null;
var lastEventListener = null;
var lastEmbed = null;

var current_selected_page = 0;
var previous_selected_page = -1;

sch_current_zoom = null;
sch_old_zoom = null;
sch_current_pan = null;

pcb_current_zoom = null;
pcb_old_zoom = null;
pcb_current_pan = null;

// Variables updated by Kiri
var selected_view = "schematic";

var netdiff_snapshots_cache = {};
var netdiff_entries_cache = {};
var netdiff_current_entries = [];
var netdiff_active_entry_index = -1;
var netdiff_commit1_snapshot = null;
var netdiff_commit2_snapshot = null;
var netdiff_sheet_rename_badges = {};

var NETDIFF_COMMIT1_COLOR = '#00FFFF';
var NETDIFF_COMMIT2_COLOR = '#880808';
var NETDIFF_MIN_SHEET_RENAME_GROUP = 2;

var is_fullscreen = false;

// =======================================
// HANDLE SHORTCUTS
// =======================================

function select_next_2_commits() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i + 1);
        }
    }

    // When second commit reaches the end, moves the first commit forward (if possible)
    if (next_selected_commits[1] >= commits.length) {
        next_selected_commits[1] = commits.length - 1;
        if (next_selected_commits[0] <= commits.length - 2) {
            next_selected_commits[0] = selected_commits[0] + 1;
        }
    }
    else {
        // By default does not change the first commit
        next_selected_commits[0] = selected_commits[0];
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= next_selected_commits[1]) {
        next_selected_commits[0] = next_selected_commits[1] - 1;
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= commits.length - 2) {
        next_selected_commits[0] = commits.length - 2;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_next_commit() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i + 1);
        }
    }

    // Fix bottom boundary
    if (next_selected_commits[1] >= commits.length - 1) {
        next_selected_commits[1] = commits.length - 1;
    }

    // Fix bottom boundary
    if (next_selected_commits[0] >= commits.length - 2) {
        next_selected_commits[0] = commits.length - 2;
    }

    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_previows_2_commits() {
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i - 1);
        }
    }

    // By default does not change the first commit
    next_selected_commits[0] = selected_commits[0];

    // When commits are touching, move first backwards (if possible)
    if (next_selected_commits[1] == next_selected_commits[0]) {
        if (next_selected_commits[0] > 0) {
            next_selected_commits[0] = next_selected_commits[0] -1;
        }
    }

    // Fix top boundary
    if (next_selected_commits[0] < 0) {
        next_selected_commits[0] = 0;
    }

    // Fix top boundary
    if (next_selected_commits[1] <= 1) {
        next_selected_commits[1] = 1;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function select_previows_commit()
{
    commits = $("#commits_form input:checkbox[name='commit']");

    selected_commits = [];
    next_selected_commits = [];

    for (i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            selected_commits.push(i);
            next_selected_commits.push(i - 1);
        }
    }

    // Fix top boundary
    if (next_selected_commits[0] <= 0) {
        next_selected_commits[0] = 0;
    }

    // Fix top boundary
    if (next_selected_commits[1] <= 1) {
        next_selected_commits[1] = 1;
    }

    // Update selected commits
    for (i = 0; i < selected_commits.length; i++) {
        commits[selected_commits[i]].checked = false;
    }
    for (i = 0; i < selected_commits.length; i++) {
        commits[next_selected_commits[i]].checked = true;
    }

    update_commits();
}

function reset_commits_selection()
{
    commits = $("#commits_form input:checkbox[name='commit']");
    selected_commits = [];
    for (i = 0; i < commits.length; i++) {
        $("#commits_form input:checkbox[name='commit']")[i].checked = false;
    }
    if (commits.length >= 2) {
        $("#commits_form input:checkbox[name='commit']")[commits.length - 2].checked = true;
        $("#commits_form input:checkbox[name='commit']")[commits.length - 1].checked = true;
    }
    else if (commits.length == 1) {
        $("#commits_form input:checkbox[name='commit']")[0].checked = true;
    }

    // reset visibility of the diff images
    $("#diff-xlink-1").css('visibility', 'visible')
    $("#commit1_legend").css('visibility', 'visible');
    $("#commit1_legend_text").css('visibility', 'visible');
    $("#commit1_legend_fs").css('visibility', 'visible');
    $("#commit1_legend_text_fs").css('visibility', 'visible');
    $("#commit1_legend").css('color', '#00FFFF');
    $("#commit1_legend_fs").css('color', '#00FFFF');

    $("#diff-xlink-2").css('visibility', 'visible')
    $("#commit2_legend").css('visibility', 'visible');
    $("#commit2_legend_text").css('visibility', 'visible');
    $("#commit2_legend_fs").css('visibility', 'visible');
    $("#commit2_legend_text_fs").css('visibility', 'visible');
    $("#commit2_legend").css('color', '#880808');
    $("#commit2_legend_fs").css('color', '#880808');

    $("#commit3_legend").css('visibility', 'visible');
    $("#commit3_legend_text").css('visibility', 'visible');
    $("#commit3_legend_fs").css('visibility', 'visible');
    $("#commit3_legend_text_fs").css('visibility', 'visible');

    apply_diff_filters_for_visibility();

    update_commits();
}

function toggle_sch_pcb_view() {
    old_view = current_view;
    current_view = $('#view_mode input[name="view_mode"]:checked').val();
    if (current_view == "show_sch") {
        show_pcb();
    } else {
        show_sch();
    }
    update_commits();
}

function apply_diff_filters_for_visibility()
{
    var old_hidden = $("#diff-xlink-1").css('visibility') === "hidden";
    var new_hidden = $("#diff-xlink-2").css('visibility') === "hidden";

    if (old_hidden && !new_hidden)
    {
        $("#diff-xlink-1").css('filter', 'url(#filter-1)');
        $("#diff-xlink-2").css('filter', 'url(#filter-22)');
    }
    else if (new_hidden && !old_hidden)
    {
        $("#diff-xlink-1").css('filter', 'url(#filter-12)');
        $("#diff-xlink-2").css('filter', 'url(#filter-2)');
    }
    else
    {
        $("#diff-xlink-1").css('filter', 'url(#filter-1)');
        $("#diff-xlink-2").css('filter', 'url(#filter-2)');
    }
}

function suspend_diff_filters_while_zooming()
{
    if (!zoom_filters_suspended)
    {
        zoom_filters_suspended = true;
        $("#diff-xlink-1").css('filter', 'none');
        $("#diff-xlink-2").css('filter', 'none');
    }

    if (zoom_filter_restore_timer) {
        clearTimeout(zoom_filter_restore_timer);
    }

    zoom_filter_restore_timer = setTimeout(function() {
        zoom_filters_suspended = false;
        apply_diff_filters_for_visibility();
        zoom_filter_restore_timer = null;
    }, 120);
}

function toggle_old_commit_visibility()
{
    if ($("#diff-xlink-1").css('visibility') === "hidden")
    {
        current_diff_filter = "diff";
        $("#diff-xlink-1").css('visibility', 'visible')
        $("#commit1_legend").css('visibility', 'visible');
        $("#commit1_legend_text").css('visibility', 'visible');
        $("#commit1_legend_fs").css('visibility', 'visible');
        $("#commit1_legend_text_fs").css('visibility', 'visible');

        $("#commit3_legend").css('visibility', 'visible');
        $("#commit3_legend_text").css('visibility', 'visible');
        $("#commit3_legend_fs").css('visibility', 'visible');
        $("#commit3_legend_text_fs").css('visibility', 'visible');
    }
    else
    {
        current_diff_filter = "single";
        $("#diff-xlink-1").css('visibility', 'hidden')
        $("#commit1_legend").css('visibility', 'hidden');
        $("#commit1_legend_text").css('visibility', 'hidden');
        $("#commit1_legend_fs").css('visibility', 'hidden');
        $("#commit1_legend_text_fs").css('visibility', 'hidden');

        $("#commit3_legend").css('visibility', 'hidden');
        $("#commit3_legend_text").css('visibility', 'hidden');
        $("#commit3_legend_fs").css('visibility', 'hidden');
        $("#commit3_legend_text_fs").css('visibility', 'hidden');
    }

    // enable the other image back
    if ($("#diff-xlink-1").css('visibility') === "hidden")
    {
        $("#diff-xlink-2").css('visibility', 'visible')
        $("#commit2_legend").css('visibility', 'visible');
        $("#commit2_legend_text").css('visibility', 'visible');
        $("#commit2_legend_fs").css('visibility', 'visible');
        $("#commit2_legend_text_fs").css('visibility', 'visible');

        $("#commit2_legend").css('color', '#a7a7a7');
        $("#commit2_legend_fs").css('color', '#a7a7a7');
    }
    else
    {
        $("#commit1_legend").css('color', '#00FFFF');
        $("#commit1_legend_fs").css('color', '#00FFFF');
        $("#commit2_legend").css('color', '#880808');
        $("#commit2_legend_fs").css('color', '#880808');
    }

    apply_diff_filters_for_visibility();
}

function toggle_new_commit_visibility()
{
    if ($("#diff-xlink-2").css('visibility') === "hidden")
    {
        current_diff_filter = "diff";
        $("#diff-xlink-2").css('visibility', 'visible')
        $("#commit2_legend").css('visibility', 'visible');
        $("#commit2_legend_text").css('visibility', 'visible');
        $("#commit2_legend_fs").css('visibility', 'visible');
        $("#commit2_legend_text_fs").css('visibility', 'visible');

        $("#commit3_legend").css('visibility', 'visible');
        $("#commit3_legend_text").css('visibility', 'visible');
        $("#commit3_legend_fs").css('visibility', 'visible');
        $("#commit3_legend_text_fs").css('visibility', 'visible');
    }
    else
    {
        current_diff_filter = "single";
        $("#diff-xlink-2").css('visibility', 'hidden')
        $("#commit2_legend").css('visibility', 'hidden');
        $("#commit2_legend_text").css('visibility', 'hidden');
        $("#commit2_legend_fs").css('visibility', 'hidden');
        $("#commit2_legend_text_fs").css('visibility', 'hidden');

        $("#commit3_legend").css('visibility', 'hidden');
        $("#commit3_legend_text").css('visibility', 'hidden');
        $("#commit3_legend_fs").css('visibility', 'hidden');
        $("#commit3_legend_text_fs").css('visibility', 'hidden');
    }

    // enable the other image back
    if ($("#diff-xlink-2").css('visibility') === "hidden")
    {
        $("#diff-xlink-1").css('visibility', 'visible')
        $("#commit1_legend").css('visibility', 'visible');
        $("#commit1_legend_text").css('visibility', 'visible');
        $("#commit1_legend_fs").css('visibility', 'visible');
        $("#commit1_legend_text_fs").css('visibility', 'visible');

        $("#commit1_legend").css('color', '#a7a7a7');
        $("#commit1_legend_text_fs").css('color', '#a7a7a7');
    }
    else
    {
        $("#commit1_legend").css('color', '#00FFFF');
        $("#commit1_legend_fs").css('color', '#00FFFF');
        $("#commit2_legend").css('color', '#880808');
        $("#commit2_legend_fs").css('color', '#880808');
    }

    apply_diff_filters_for_visibility();
}

function select_next_sch_or_pcb(cycle = false) {
    if (document.getElementById("show_sch").checked) {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));

        new_index = selected_page + 1;
        if (new_index >= pages.length) {
            if (cycle) {
                new_index = 0;
            }
            else {
                new_index = pages.length - 1;
            }
        }

        pages[new_index].checked = true;

        update_page();
    }
    else
    {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));

        new_index = selected_layer + 1;
        if (new_index >= layers.length) {
            if (cycle) {
                new_index = 0;
            }
            else {
                new_index = layers.length - 1;
            }
        }

        layers[new_index].checked = true;

        update_layer();
    }
}

function select_preview_sch_or_pcb(cycle = false) {
    if (document.getElementById("show_sch").checked) {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));

        new_index = selected_page - 1;
        if (new_index < 0) {
            if (cycle) {
                new_index = pages.length - 1;
            }
            else {
                new_index = 0;
            }
        }

        pages[new_index].checked = true;

        update_page();
        update_sheets_list(commit1, commit2);

    } else {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));

        new_index = selected_layer - 1;
        if (new_index < 0) {
            if (cycle) {
                new_index = layers.length - 1;
            }
            else {
                new_index = 0;
            }
        }

        layers[new_index].checked = true;

        update_layer();
    }
}

function svg_fit_center()
{
    panZoom_instance.resetZoom();
    panZoom_instance.center();
}

function svg_zoom_in()
{
    suspend_diff_filters_while_zooming();
    panZoom_instance.zoomIn();
}

function svg_zoom_out()
{
    suspend_diff_filters_while_zooming();
    panZoom_instance.zoomOut();
}

function manual_pan(direction)
{
    const step = 50;

    switch(direction) {
       case "up":
            panZoom_instance.panBy({x: 0, y: step});
            break;
       case "down":
            panZoom_instance.panBy({x: 0, y: -step});
            break;
       case "left":
            panZoom_instance.panBy({x: step, y: 0});
            break;
       case "right":
            panZoom_instance.panBy({x: -step, y: 0});
            break;
    }
}

// Commits
Mousetrap.bind(['ctrl+down', 'ctrl+]','command+down', 'command+]'], function(){select_next_2_commits()});
Mousetrap.bind(['down', ']'],      function(){select_next_commit()});

Mousetrap.bind(['ctrl+up', 'ctrl+[', 'command+up', 'command+['], function(){select_previows_2_commits()});
Mousetrap.bind(['up', '['],        function(){select_previows_commit()});

Mousetrap.bind(['r', 'R'],  function(){reset_commits_selection()});

// View
Mousetrap.bind(['s', 'S'],  function(){toggle_sch_pcb_view()});

Mousetrap.bind(['q', 'Q'],  function(){toggle_old_commit_visibility()});
Mousetrap.bind(['w', 'W'],  function(){toggle_new_commit_visibility()});

Mousetrap.bind(['alt+q', 'alt+Q'],  function(){toggle_new_commit_visibility()});
Mousetrap.bind(['alt+w', 'alt+W'],  function(){toggle_old_commit_visibility()});

Mousetrap.bind(['right'], function(){select_next_sch_or_pcb()});
Mousetrap.bind(['left'],  function(){select_preview_sch_or_pcb()});

Mousetrap.bind(['ctrl+right', 'command+right'], function(){select_next_sch_or_pcb(true)});
Mousetrap.bind(['ctrl+left', 'command+left'],  function(){select_preview_sch_or_pcb(true)});

// SVG PAN
Mousetrap.bind('alt+up',    function(){manual_pan("up")});
Mousetrap.bind('alt+down',  function(){manual_pan("down")});
Mousetrap.bind('alt+left',  function(){manual_pan("left")});
Mousetrap.bind('alt+right', function(){manual_pan("right")});

// SVG ZOOM
Mousetrap.bind('0',        function(){svg_fit_center()});
Mousetrap.bind(['+', '='], function(){svg_zoom_in()});
Mousetrap.bind('-',        function(){svg_zoom_out()});

// Misc
Mousetrap.bind(['f', 'F'], function(){toggle_fullscreen()});
Mousetrap.bind(['i', 'I'], function(){show_info_popup()});

// =======================================
// =======================================

// For images related with each commit, it is good to have the same image cached with the same specially when serving throug the internet
// For those images, it uses the commit hash as the timestamp
function url_timestamp(timestamp_id="") {
    if (timestamp_id) {
        return "?t=" + timestamp_id;
    }
    else {
        return "?t=" + new Date().getTime();
    }
}

function if_url_exists(url, callback) {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.setRequestHeader('Accept', '*/*');
    request.onprogress = function(event) {
        let status = event.target.status;
        let statusFirstNumber = (status).toString()[0];
        switch (statusFirstNumber) {
            case '2':
                request.abort();
                return callback(true);
            default:
                request.abort();
                return callback(false);
        }
    };
    request.send('');
}

function update_commits() {

    // Remove tooltips so they dont get stuck
    $('[data-toggle="tooltip"]').tooltip("hide");

    console.log("================================================================================");

    var commits = $("#commits_form input:checkbox[name='commit']");
    var hashes = [];
    var selected_indices = [];

    for (var i = 0; i < commits.length; i++) {
        if (commits[i].checked) {
            var value = commits[i].value;
            hashes.push(value);
            selected_indices.push(i);
        }
    }

    // It needs 2 items selected to do something
    if (hashes.length < 2) {
        return;
    }

    // Update selected commits (commit1=newest, commit2=oldest)
    var newer_idx = Math.max(selected_indices[0], selected_indices[1]);
    var older_idx = Math.min(selected_indices[0], selected_indices[1]);

    commit1 = commits[newer_idx].value.replace(/\s+/g, '');
    commit2 = commits[older_idx].value.replace(/\s+/g, '');

    console.log("commit1:", commit1);
    console.log("commit2:", commit2);


    // 1. Update commit_legend_links
    // 2. Update commit_legend
    // 3. Update current_diff_view


    // Update commit_legend_links

    var old_commit1 = document.getElementById("commit1_hash").value;
    var old_commit2 = document.getElementById("commit2_hash").value;

    var kicad_pro_path_1 = document.getElementById("commit1_kicad_pro_path").value;
    var kicad_pro_path_2 = document.getElementById("commit2_kicad_pro_path").value;

    document.getElementById("commit1_kicad_pro_path").value = kicad_pro_path_1.replace(old_commit1, commit1);
    document.getElementById("commit2_kicad_pro_path").value = kicad_pro_path_2.replace(old_commit2, commit2);

    // Update commit_legend

    document.getElementById("commit1_hash").value = commit1;
    document.getElementById("commit2_hash").value = commit2;

    document.getElementById("commit1_legend_hash").innerHTML = commit1;
    document.getElementById("commit2_legend_hash").innerHTML = commit2;

    // Update current_diff_view

    old_view = current_view;
    current_view = $('#view_mode input[name="view_mode"]:checked').val();

    if (current_view == "show_sch") {
        update_page();
    } else {
        update_layer();
    }

    update_netdiff_panel();
}

function loadFile(filePath) {

    console.log("filePath:", filePath);

    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', filePath, false);
    xmlhttp.send();
    if (xmlhttp.status==200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function loadJsonFile(filePath) {
    var text = loadFile(filePath);
    if (text === null || text === "") {
        return null;
    }

    try {
        return JSON.parse(text);
    }
    catch (error) {
        console.log("Failed to parse JSON:", filePath, error);
        return null;
    }
}

function get_netdiff_snapshot(commit_hash) {
    if (!commit_hash) {
        return null;
    }

    if (netdiff_snapshots_cache[commit_hash]) {
        return netdiff_snapshots_cache[commit_hash];
    }

    var snapshot_path = "../" + commit_hash + "/_KIRI_/netdiff_snapshot.json" + url_timestamp(commit_hash);
    var snapshot = loadJsonFile(snapshot_path);

    if (snapshot) {
        netdiff_snapshots_cache[commit_hash] = snapshot;
    }

    return snapshot;
}

function normalize_members(members) {
    if (!Array.isArray(members)) {
        return [];
    }

    return members
        .map((member) => {
            var ref = member && member.ref ? member.ref : "";
            var pin = member && member.pin ? member.pin : "";
            return ref + "|" + pin;
        })
        .sort();
}

function member_sets_equal(members_a, members_b) {
    var a = normalize_members(members_a);
    var b = normalize_members(members_b);

    if (a.length !== b.length) {
        return false;
    }

    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

function refs_from_members(members) {
    if (!Array.isArray(members)) {
        return [];
    }

    var refs = [];
    for (const member of members) {
        if (member && member.ref && !refs.includes(member.ref)) {
            refs.push(member.ref);
        }
    }
    return refs;
}

function member_key(member) {
    if (!member) {
        return "";
    }

    var ref = member.ref || "";
    var pin = member.pin || "";
    return ref + "::" + pin;
}

function member_delta(members_a, members_b) {
    var left = Array.isArray(members_a) ? members_a : [];
    var right = Array.isArray(members_b) ? members_b : [];

    var set_a = new Set(left.map(member_key));
    var set_b = new Set(right.map(member_key));

    var removed = [];
    for (const member of left) {
        if (!set_b.has(member_key(member))) {
            removed.push(member);
        }
    }

    var added = [];
    for (const member of right) {
        if (!set_a.has(member_key(member))) {
            added.push(member);
        }
    }

    var unchanged_count = left.length - removed.length;

    return {
        added: added,
        removed: removed,
        unchanged_count: unchanged_count
    };
}

function format_member(member) {
    if (!member) {
        return "";
    }

    var ref = member.ref || "?";
    var pin = member.pin_name || member.pin || "?";
    return ref + "-" + pin;
}

function page_for_member(member, preferred_snapshot, fallback_snapshot) {
    if (!member) {
        return null;
    }

    if (member.page) {
        return member.page;
    }

    return page_for_ref(member.ref, preferred_snapshot, fallback_snapshot);
}

function pages_from_members(members, preferred_snapshot, fallback_snapshot) {
    if (!Array.isArray(members)) {
        return [];
    }

    var pages = [];
    for (const member of members) {
        var page = page_for_member(member, preferred_snapshot, fallback_snapshot);
        if (page && !pages.includes(page)) {
            pages.push(page);
        }
    }

    return pages.sort();
}

function all_members_for_entry(entry) {
    var members = [];

    var members_b = entry && entry.members_b ? entry.members_b : [];
    for (const member of members_b) {
        members.push(member);
    }

    var members_a = entry && entry.members_a ? entry.members_a : [];
    for (const member of members_a) {
        members.push(member);
    }

    return members;
}

function changed_members_for_entry(entry) {
    var members = [];

    var removed = entry && entry.removed_members ? entry.removed_members : [];
    for (const member of removed) {
        members.push(member);
    }

    var added = entry && entry.added_members ? entry.added_members : [];
    for (const member of added) {
        members.push(member);
    }

    return members;
}

function net_pages_for_entry(entry, preferred_snapshot, fallback_snapshot) {
    return pages_from_members(all_members_for_entry(entry), preferred_snapshot, fallback_snapshot);
}

function changed_pages_for_entry(entry, preferred_snapshot, fallback_snapshot) {
    if (!entry || entry.type !== "changed") {
        return [];
    }

    return pages_from_members(changed_members_for_entry(entry), preferred_snapshot, fallback_snapshot);
}

function primary_page_for_entry(entry, preferred_snapshot, fallback_snapshot) {
    if (entry && entry.type === "sheet_rename") {
        return entry.page_id || null;
    }

    var changed_pages = changed_pages_for_entry(entry, preferred_snapshot, fallback_snapshot);
    if (changed_pages.length) {
        return changed_pages[0];
    }

    var net_pages = net_pages_for_entry(entry, preferred_snapshot, fallback_snapshot);
    if (net_pages.length) {
        return net_pages[0];
    }

    var refs = netdiff_refs_for_entry(entry);
    return refs.length ? page_for_ref(refs[0], preferred_snapshot, fallback_snapshot) : null;
}

function format_page_list(pages, max_count) {
    var list = Array.isArray(pages) ? pages : [];
    if (!list.length) {
        return "(none)";
    }

    var limit = max_count || 4;
    var visible = list.slice(0, limit);
    var hidden = list.length - visible.length;
    var text = visible.join(", ");
    if (hidden > 0) {
        text += ` +${hidden}`;
    }
    return text;
}

function member_delta_summary(entry) {
    var added_count = (entry && entry.added_members) ? entry.added_members.length : 0;
    var removed_count = (entry && entry.removed_members) ? entry.removed_members.length : 0;
    var unchanged_count = (entry && Number.isInteger(entry.unchanged_member_count)) ? entry.unchanged_member_count : 0;

    return `<span class="netdiff-added">+${added_count}</span> <span class="netdiff-removed">-${removed_count}</span> <span class="netdiff-unchanged">=${unchanged_count}</span>`;
}

function member_delta_preview(entry, max_count) {
    var limit = max_count || 4;
    var parts = [];

    var removed = (entry && entry.removed_members) ? entry.removed_members : [];
    for (const member of removed.slice(0, limit)) {
        parts.push(`<span class="netdiff-removed">-${html_escape(format_member(member))}</span>`);
    }

    var remaining = Math.max(0, limit - removed.length);
    var added = (entry && entry.added_members) ? entry.added_members : [];
    for (const member of added.slice(0, remaining)) {
        parts.push(`<span class="netdiff-added">+${html_escape(format_member(member))}</span>`);
    }

    var hidden = removed.length + added.length - Math.min(removed.length, limit) - Math.min(added.length, remaining);
    if (hidden > 0) {
        parts.push(`<span class="netdiff-unchanged">+${hidden} more</span>`);
    }

    if (!parts.length) {
        parts.push('<span class="netdiff-unchanged">no pin-level delta</span>');
    }

    return parts.join(" ");
}

function changed_net_metadata(entry) {
    var changed_pages = changed_pages_for_entry(entry, netdiff_commit2_snapshot, netdiff_commit1_snapshot);
    var net_pages = net_pages_for_entry(entry, netdiff_commit2_snapshot, netdiff_commit1_snapshot);

    return [
        `${member_delta_summary(entry)} · <span class="netdiff-unchanged">changed on ${html_escape(format_page_list(changed_pages, 2))}</span>`,
        member_delta_preview(entry, 4),
        `<span class="netdiff-unchanged">net spans ${net_pages.length} page${net_pages.length === 1 ? "" : "s"}</span>`
    ].join("<br>");
}

function detect_sheet_renames(renamed_items) {
    var groups = {};
    var non_sheet = [];

    for (const item of renamed_items) {
        var na = item.net_name_a;
        var nb = item.net_name_b;

        var slash_a = na.lastIndexOf('/');
        var slash_b = nb.lastIndexOf('/');

        if (slash_a <= 0 || slash_b <= 0) {
            non_sheet.push(item);
            continue;
        }

        var prefix_a = na.substring(0, slash_a);
        var prefix_b = nb.substring(0, slash_b);
        var local_a = na.substring(slash_a + 1);
        var local_b = nb.substring(slash_b + 1);

        if (local_a !== local_b || prefix_a === prefix_b) {
            non_sheet.push(item);
            continue;
        }

        var group_key = prefix_a + "||" + prefix_b;
        if (!groups[group_key]) {
            groups[group_key] = { prefix_a: prefix_a, prefix_b: prefix_b, items: [] };
        }
        groups[group_key].items.push(item);
    }

    var sheet_renames = [];

    for (const group_key of Object.keys(groups)) {
        var group = groups[group_key];
        var items = group.items;

        if (!items || items.length < NETDIFF_MIN_SHEET_RENAME_GROUP) {
            non_sheet = non_sheet.concat(items || []);
            continue;
        }

        var all_refs_a = [];
        var all_refs_b = [];
        var page_id = null;

        for (const item of items) {
            for (const ref of (item.refs_a || [])) {
                if (!all_refs_a.includes(ref)) { all_refs_a.push(ref); }
            }
            for (const ref of (item.refs_b || [])) {
                if (!all_refs_b.includes(ref)) { all_refs_b.push(ref); }
            }
            if (!page_id) {
                for (const m of (item.members_b || []).concat(item.members_a || [])) {
                    if (m && m.page) { page_id = m.page; break; }
                }
            }
        }

        var parts_a = group.prefix_a.split('/').filter(function(s) { return s.length > 0; });
        var parts_b = group.prefix_b.split('/').filter(function(s) { return s.length > 0; });
        var sheet_name_a = parts_a.length ? parts_a[parts_a.length - 1] : group.prefix_a;
        var sheet_name_b = parts_b.length ? parts_b[parts_b.length - 1] : group.prefix_b;

        sheet_renames.push({
            type: "sheet_rename",
            prefix_a: group.prefix_a,
            prefix_b: group.prefix_b,
            sheet_name_a: sheet_name_a,
            sheet_name_b: sheet_name_b,
            page_id: page_id,
            net_count: items.length,
            nets: items,
            refs_a: all_refs_a,
            refs_b: all_refs_b
        });
    }

    return { sheet_renames: sheet_renames, remaining: non_sheet };
}

function apply_netdiff_page_annotations() {
    for (const page_id of Object.keys(netdiff_sheet_rename_badges)) {
        var label = document.getElementById("label-" + page_id);
        if (!label) { continue; }

        var existing = label.querySelector(".netdiff-sheet-rename-badge");
        if (existing) { existing.remove(); }

        var badge_html = netdiff_sheet_rename_badges[page_id];
        if (badge_html) {
            label.insertAdjacentHTML("beforeend", badge_html);
        }
    }
}

function compare_netdiff_snapshots(snapshot_a, snapshot_b) {
    var nets_a = (snapshot_a && snapshot_a.nets) ? snapshot_a.nets : {};
    var nets_b = (snapshot_b && snapshot_b.nets) ? snapshot_b.nets : {};

    var keys_a = Object.keys(nets_a);
    var keys_b = Object.keys(nets_b);
    var set_a = new Set(keys_a);
    var set_b = new Set(keys_b);

    var both = keys_a.filter((k) => set_b.has(k)).sort();
    var only_a = keys_a.filter((k) => !set_b.has(k)).sort();
    var only_b = keys_b.filter((k) => !set_a.has(k)).sort();

    var changed = [];
    for (const net_name of both) {
        if (!member_sets_equal(nets_a[net_name], nets_b[net_name])) {
            var delta = member_delta(nets_a[net_name], nets_b[net_name]);
            changed.push({
                type: "changed",
                net_name: net_name,
                members_a: nets_a[net_name],
                members_b: nets_b[net_name],
                added_members: delta.added,
                removed_members: delta.removed,
                unchanged_member_count: delta.unchanged_count,
                refs_a: refs_from_members(nets_a[net_name]),
                refs_b: refs_from_members(nets_b[net_name])
            });
        }
    }

    var renamed = [];
    var consumed_a = new Set();
    var consumed_b = new Set();

    for (const name_a of only_a) {
        if (consumed_a.has(name_a)) {
            continue;
        }

        for (const name_b of only_b) {
            if (consumed_b.has(name_b)) {
                continue;
            }

            if (member_sets_equal(nets_a[name_a], nets_b[name_b])) {
                renamed.push({
                    type: "renamed",
                    net_name_a: name_a,
                    net_name_b: name_b,
                    members_a: nets_a[name_a],
                    members_b: nets_b[name_b],
                    refs_a: refs_from_members(nets_a[name_a]),
                    refs_b: refs_from_members(nets_b[name_b])
                });
                consumed_a.add(name_a);
                consumed_b.add(name_b);
                break;
            }
        }
    }

    var only_in_a = [];
    for (const name_a of only_a) {
        if (consumed_a.has(name_a)) {
            continue;
        }

        only_in_a.push({
            type: "only_a",
            net_name: name_a,
            members_a: nets_a[name_a],
            refs_a: refs_from_members(nets_a[name_a])
        });
    }

    var only_in_b = [];
    for (const name_b of only_b) {
        if (consumed_b.has(name_b)) {
            continue;
        }

        only_in_b.push({
            type: "only_b",
            net_name: name_b,
            members_b: nets_b[name_b],
            refs_b: refs_from_members(nets_b[name_b])
        });
    }

    var sheet_rename_result = detect_sheet_renames(renamed);

    return {
        changed: changed,
        renamed: sheet_rename_result.remaining,
        sheet_renames: sheet_rename_result.sheet_renames,
        only_a: only_in_a,
        only_b: only_in_b
    };
}

function netdiff_refs_for_entry(entry) {
    if (!entry) {
        return [];
    }

    var refs = [];
    var refs_a = entry.refs_a || [];
    var refs_b = entry.refs_b || [];

    for (const ref of refs_b) {
        if (!refs.includes(ref)) {
            refs.push(ref);
        }
    }
    for (const ref of refs_a) {
        if (!refs.includes(ref)) {
            refs.push(ref);
        }
    }

    return refs;
}

function html_escape(text) {
    if (text === undefined || text === null) {
        return "";
    }

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function render_netdiff_items(group_title, items, start_index, name_builder, refs_builder, metadata_builder, name_html_builder) {
    if (!items || items.length === 0) {
        return { html: "", next_index: start_index };
    }

    var html = "";
    html += `<div class="netdiff-group-title">${group_title} (${items.length})</div>`;

    var index = start_index;
    for (const item of items) {
        var metadata;
        if (metadata_builder) {
            metadata = metadata_builder(item);
        }
        else {
            var refs = refs_builder(item);
            var refs_preview = refs.length ? refs.slice(0, 5).join(", ") : "(no refs)";
            var refs_suffix = refs.length > 5 ? ` +${refs.length - 5}` : "";
            metadata = html_escape(refs_preview + refs_suffix);
        }

        var name_html = name_html_builder ? name_html_builder(item) : html_escape(name_builder(item));

        html += `
            <button id="netdiff-item-${index}" type="button" class="netdiff-item" onclick="focus_netdiff_entry(${index})">
                <div>${name_html}</div>
                <div class="netdiff-metadata">${metadata}</div>
            </button>
        `;

        netdiff_current_entries.push(item);
        index += 1;
    }

    return { html: html, next_index: index };
}

function update_netdiff_panel() {
    var panel = document.getElementById("netdiff_list_content");
    var focus = document.getElementById("netdiff_focus");

    if (!panel || !focus) {
        return;
    }

    focus.style.display = "none";
    focus.innerHTML = "";

    if (!commit1 || !commit2) {
        panel.innerHTML = '<small class="text-muted">Select two commits to load netlist diff.</small>';
        return;
    }

    var cache_key = commit1 + "::" + commit2;
    var result = netdiff_entries_cache[cache_key];

    netdiff_commit1_snapshot = get_netdiff_snapshot(commit1);
    netdiff_commit2_snapshot = get_netdiff_snapshot(commit2);

    if (!netdiff_commit1_snapshot || !netdiff_commit2_snapshot) {
        panel.innerHTML = '<small class="text-warning">Netlist snapshot unavailable for one or both commits.</small>';
        return;
    }

    if (!result) {
        result = compare_netdiff_snapshots(netdiff_commit1_snapshot, netdiff_commit2_snapshot);
        netdiff_entries_cache[cache_key] = result;
    }

    netdiff_current_entries = [];
    netdiff_active_entry_index = -1;

    var html = "";
    html += `<div class="netdiff-metadata" style="margin-bottom: 8px;">${html_escape(commit1)} → ${html_escape(commit2)}</div>`;

    var idx = 0;

    var changed_render = render_netdiff_items(
        "Changed nets",
        result.changed,
        idx,
        (item) => item.net_name,
        (item) => netdiff_refs_for_entry(item),
        (item) => changed_net_metadata(item)
    );
    html += changed_render.html;
    idx = changed_render.next_index;

    var sheet_renames_render = render_netdiff_items(
        "Sheet renames",
        result.sheet_renames || [],
        idx,
        (item) => item.sheet_name_a + " → " + item.sheet_name_b,
        (item) => netdiff_refs_for_entry(item),
        (item) => `<span class="netdiff-unchanged">${item.net_count} nets · ${html_escape(item.page_id || '?')}</span>`,
        (item) => `<span class="netdiff-commit1-color">${html_escape(item.sheet_name_a)}</span> <span class="netdiff-unchanged">→</span> <span class="netdiff-commit2-color">${html_escape(item.sheet_name_b)}</span>`
    );
    html += sheet_renames_render.html;
    idx = sheet_renames_render.next_index;

    var renamed_render = render_netdiff_items(
        "Renamed nets",
        result.renamed,
        idx,
        (item) => item.net_name_a + " → " + item.net_name_b,
        (item) => netdiff_refs_for_entry(item)
    );
    html += renamed_render.html;
    idx = renamed_render.next_index;

    var only_a_render = render_netdiff_items(
        "Only in older commit",
        result.only_a,
        idx,
        (item) => item.net_name,
        (item) => netdiff_refs_for_entry(item)
    );
    html += only_a_render.html;
    idx = only_a_render.next_index;

    var only_b_render = render_netdiff_items(
        "Only in newer commit",
        result.only_b,
        idx,
        (item) => item.net_name,
        (item) => netdiff_refs_for_entry(item)
    );
    html += only_b_render.html;

    if (idx === 0) {
        panel.innerHTML = '<small class="text-success">No logical netlist changes between selected commits.</small>';
        return;
    }

    panel.innerHTML = html;

    // Build page-label badges for sheet renames
    netdiff_sheet_rename_badges = {};
    for (const entry of (result.sheet_renames || [])) {
        if (entry.page_id) {
            netdiff_sheet_rename_badges[entry.page_id] =
                `<span class="netdiff-sheet-rename-badge">` +
                `<span style="color:${NETDIFF_COMMIT1_COLOR}">${html_escape(entry.sheet_name_a)}</span>` +
                ` → ` +
                `<span style="color:${NETDIFF_COMMIT2_COLOR}">${html_escape(entry.sheet_name_b)}</span>` +
                `</span>`;
        }
    }
    apply_netdiff_page_annotations();
}

function page_for_ref(ref, preferred_snapshot, fallback_snapshot) {
    if (!ref) {
        return null;
    }

    if (preferred_snapshot && preferred_snapshot.refs && preferred_snapshot.refs[ref]) {
        return preferred_snapshot.refs[ref].page;
    }

    if (fallback_snapshot && fallback_snapshot.refs && fallback_snapshot.refs[ref]) {
        return fallback_snapshot.refs[ref].page;
    }

    return null;
}

function highlight_page_label(page_id) {
    if (!page_id) {
        return;
    }

    var label = document.getElementById("label-" + page_id);
    if (!label) {
        return;
    }

    label.classList.remove("page-highlight-pulse");
    void label.offsetWidth;
    label.classList.add("page-highlight-pulse");

    setTimeout(function() {
        label.classList.remove("page-highlight-pulse");
    }, 1600);
}

function activate_netdiff_entry(entry_index) {
    if (netdiff_active_entry_index >= 0) {
        var old_item = document.getElementById("netdiff-item-" + netdiff_active_entry_index);
        if (old_item) {
            old_item.classList.remove("netdiff-item-active");
        }
    }

    var new_item = document.getElementById("netdiff-item-" + entry_index);
    if (new_item) {
        new_item.classList.add("netdiff-item-active");
    }

    netdiff_active_entry_index = entry_index;
}

function focus_netdiff_entry(entry_index) {
    var entry = netdiff_current_entries[entry_index];
    if (!entry) {
        return;
    }

    activate_netdiff_entry(entry_index);

    if (!document.getElementById("show_sch").checked) {
        show_sch();
    }

    var refs = netdiff_refs_for_entry(entry);

    var preferred_snapshot = netdiff_commit2_snapshot;
    var fallback_snapshot = netdiff_commit1_snapshot;

    if (entry.type === "only_a") {
        preferred_snapshot = netdiff_commit1_snapshot;
        fallback_snapshot = netdiff_commit2_snapshot;
    }

    var page_id = primary_page_for_entry(entry, preferred_snapshot, fallback_snapshot);
    var changed_pages = changed_pages_for_entry(entry, preferred_snapshot, fallback_snapshot);
    var net_pages = net_pages_for_entry(entry, preferred_snapshot, fallback_snapshot);

    if (page_id) {
        var pages = $("#pages_list input:radio[name='pages']");
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].id === page_id) {
                pages[i].checked = true;
                break;
            }
        }
        update_page();
        highlight_page_label(page_id);
    }

    var focus = document.getElementById("netdiff_focus");
    if (focus) {
        var name;
        var name_html;
        if (entry.type === "renamed") {
            name = entry.net_name_a + " → " + entry.net_name_b;
            name_html = html_escape(name);
        }
        else if (entry.type === "sheet_rename") {
            name = entry.sheet_name_a + " → " + entry.sheet_name_b;
            name_html = `<span class="netdiff-commit1-color">${html_escape(entry.sheet_name_a)}</span> → <span class="netdiff-commit2-color">${html_escape(entry.sheet_name_b)}</span>`;
        }
        else {
            name = entry.net_name;
            name_html = html_escape(name);
        }

        var location_text = page_id ? ("Jumped to: " + page_id) : "Jumped to: not resolved";
        var refs_text = refs.length ? refs.join(", ") : "(none)";

        var delta_details = "";
        if (entry.type === "sheet_rename") {
            delta_details = `<div><span class="netdiff-unchanged">${entry.net_count} nets collapsed — all signals in sheet renamed</span></div>`;
        }
        else if (entry.type === "changed") {
            var removed = (entry.removed_members || []).slice(0, 12).map((m) => `<span class="netdiff-removed">-${html_escape(format_member(m))}</span>`).join(", ");
            var added = (entry.added_members || []).slice(0, 12).map((m) => `<span class="netdiff-added">+${html_escape(format_member(m))}</span>`).join(", ");

            var removed_more = (entry.removed_members || []).length - Math.min((entry.removed_members || []).length, 12);
            var added_more = (entry.added_members || []).length - Math.min((entry.added_members || []).length, 12);

            delta_details = `
                <div>Pin delta: ${member_delta_summary(entry)}</div>
                <div>${removed || '<span class="netdiff-unchanged">No removed pins</span>'}${removed_more > 0 ? ` <span class="netdiff-unchanged">(+${removed_more} more)</span>` : ""}</div>
                <div>${added || '<span class="netdiff-unchanged">No added pins</span>'}${added_more > 0 ? ` <span class="netdiff-unchanged">(+${added_more} more)</span>` : ""}</div>
                <div>Changed pages: ${html_escape(format_page_list(changed_pages, 6))}</div>
            `;
        }

        focus.innerHTML = `
            <div><strong>${name_html}</strong></div>
            <div>${html_escape(location_text)}</div>
            <div>Net spans: ${html_escape(format_page_list(net_pages, 8))}</div>
            ${delta_details}
            <div>Refs: ${html_escape(refs_text)}</div>
        `;
        focus.style.display = "block";
    }
}

function update_page()
{
    console.log("-----------------------------------------");

    // Runs only when updating commits
    update_sheets_list(commit1, commit2);

    var pages = $("#pages_list input:radio[name='pages']");
    var selected_page;
    var page_name;

    // if a different page was in use before, revert the selection to it
    // TODO: maybe I have to use a list instead...
    if (previous_selected_page > -1) {
        pages[previous_selected_page].checked = true;
        previous_selected_page = -1;
    }

    // try to get the first page
    try {
        selected_page = pages.index(pages.filter(':checked'));
        page_name = pages[selected_page].id;
        current_selected_page = selected_page;

    // if there is no page selected, select the first one
    // TODO: instead of the first item by default, a better solution would change to the next inferior index
    // and keep decrementing until reaching a valid index
    } catch (error) {
        previous_selected_page = current_selected_page;
        pages[0].checked = true;
        selected_page = pages.index(pages.filter(':checked'));
        page_name = pages[selected_page].id;
    }

    var page_filename = pages[selected_page].value.replace(".kicad_sch", "").replace(".sch", "");

    if (commit1 == ""){
        commit1 = document.getElementById("diff-xlink-1-sch").href.baseVal.split("/")[1];
    }
    if (commit2 == ""){
        commit2 = document.getElementById("diff-xlink-2-sch").href.baseVal.split("/")[1];
    }

    var image_path_1 = "../" + commit1 + "/_KIRI_/sch/" + page_filename + ".svg";
    var image_path_2 = "../" + commit2 + "/_KIRI_/sch/" + page_filename + ".svg";

    console.log("[SCH] page_filename =", page_filename);
    console.log("[SCH]  image_path_1 =", image_path_1);
    console.log("[SCH]  image_path_2 =", image_path_2);

    var image_path_timestamp_1 = image_path_1 + url_timestamp(commit1);
    var image_path_timestamp_2 = image_path_2 + url_timestamp(commit2);

    if (current_view != old_view)
    {
        old_view = current_view;
        removeEmbed();
        lastEmbed = createNewEmbed(image_path_timestamp_1, image_path_timestamp_2);
    }
    else
    {
        document.getElementById("diff-xlink-1").href.baseVal = image_path_timestamp_1;
        document.getElementById("diff-xlink-2").href.baseVal = image_path_timestamp_2;

        document.getElementById("diff-xlink-1").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_1);
        document.getElementById("diff-xlink-2").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_2);

        if_url_exists(image_path_timestamp_1, function(exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-1").parentElement.style.display = 'inline' }
            else {
                document.getElementById("diff-xlink-1").parentElement.style.display = "none";
            }
        });

        if_url_exists(image_path_timestamp_2, function(exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-2").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-2").parentElement.style.display = "none";
            }
        });
    }

    // keep images visibility the same as the legend
    $("#diff-xlink-1").css('visibility', $("#commit1_legend").css('visibility'))
    $("#diff-xlink-2").css('visibility', $("#commit2_legend").css('visibility'))

    update_fullscreen_label();
}

function update_sheets_list(commit1, commit2) {

    // Get current selected page name
    var pages = $("#pages_list input:radio[name='pages']");
    var selected_page = pages.index(pages.filter(':checked'));

    // Save the current selected page, if any
    try {
        selected_sheet = pages[selected_page].id;
    }
    catch(err) {
        selected_page = "";
        console.log("There isn't a sheet selected");
    }

    // Data format: ID|LAYER

    data1 = loadFile("../" + commit1 + "/_KIRI_/sch_sheets" + url_timestamp(commit1)).split("\n").filter((a) => a);
    data2 = loadFile("../" + commit2 + "/_KIRI_/sch_sheets" + url_timestamp(commit2)).split("\n").filter((a) => a);

    var sheets = [];

    for (const d of data1)
    {
        sheet = d.split("|")[0];
        sheets.push(sheet);
    }

    for (const d of data2)
    {
        sheet = d.split("|")[0];
        if (! sheets.includes(sheet))
        {
            sheets.push(sheet);
        }
    }

    // sheets.sort();
    // sheets = Array.from(new Set(sheets.sort()));
    sheets = Array.from(new Set(sheets));

    console.log("[SCH]  Sheets =", sheets.length);
    console.log("sheets", sheets);

    var new_sheets_list = [];
    var form_inputs_html;

    for (const sheet of sheets)
    {
        var input_html = `
        <input id="${sheet}" data-toggle="tooltip" title="${sheet}" type="radio" value="${sheet}" name="pages" onchange="update_page()">
            <label for="${sheet}" data-toggle="tooltip" title="${sheet}" id="label-${sheet}" class="rounded text-sm-left list-group-item radio-box" onclick="update_page_onclick()" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span data-toggle="tooltip" title="${sheet}" style="margin-left:0.5em; margin-right:0.1em;" class="iconify" data-icon="gridicons:pages" data-inline="false"></span>
                ${sheet}
            </label>
        </label>
        `;

        new_sheets_list.push(sheet);

        form_inputs_html = form_inputs_html + input_html;
    }

    // Get the current list of pages
    pages = $("#pages_list input:radio[name='pages']");
    const current_sheets_list = Array.from(pages).map((opt) => opt.id);

    // Return if the current list is equal to the new list
    console.log("current_sheets_list = ", current_sheets_list);
    console.log("new_sheets_list = ", new_sheets_list);
    if (current_sheets_list.toString() === new_sheets_list.toString()) {
        console.log("Keep the same list of sheets");
        return;
    }

    // Update list of pages
    sheets_element = document.getElementById("pages_list_form");
    sheets_element.innerHTML = form_inputs_html.replace("undefined", "");

    // Re-apply sheet rename badges after list rebuild
    apply_netdiff_page_annotations();

    // rerun tooltips since they are getting ugly.
    $('[data-toggle="tooltip"]').tooltip({html: true});
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({boundary: 'body'});

    const optionLabels = Array.from(pages).map((opt) => opt.id);

    const hasOption = optionLabels.includes(selected_sheet);
    if (hasOption) {
        // Keep previews selection active
        $("#pages_list input:radio[name='pages'][value='" + selected_sheet + "']").prop('checked', true);
    }
    else {
        // If old selection does not exist, maybe the list is now shorter, then select the last item...
        pages[optionLabels.length-1].checked = true;
    }

    // If nothing is selected still, select the first item
    if (!pages.filter(':checked').length) {
        pages[0].checked = true;
    }
}

function layer_color(layer_id) {

    var color;

    console.log(">>> layer_id", layer_id);

    const F_Cu      = 0;
    const In1_Cu    = 1;
    const In2_Cu    = 2;
    const In3_Cu    = 3;
    const In4_Cu    = 4;
    const B_Cu      = 31;
    const B_Adhes   = 32;
    const F_Adhes   = 33;
    const B_Paste   = 34;
    const F_Paste   = 35;
    const B_SilkS   = 36;
    const F_SilkS   = 37;
    const B_Mask    = 38;
    const F_Mask    = 39;
    const Dwgs_User = 40;
    const Cmts_User = 41;
    const Eco1_User = 42;
    const Eco2_User = 43;
    const Edge_Cuts = 44;
    const Margin    = 45;
    const B_CrtYd   = 46;
    const F_CrtYd   = 47;
    const B_Fab     = 48;
    const F_Fab     = 49;

    switch(layer_id) {
        case B_Adhes:   color="#3545A8"; break;
        case B_CrtYd:   color="#D3D04B"; break;
        case B_Cu:      color="#359632"; break;
        case B_Fab:     color="#858585"; break;
        case B_Mask:    color="#943197"; break;
        case B_Paste:   color="#969696"; break;
        case B_SilkS:   color="#481649"; break;
        case Cmts_User: color="#7AC0F4"; break;
        case Dwgs_User: color="#0364D3"; break;
        case Eco1_User: color="#008500"; break;
        case Eco2_User: color="#008500"; break;
        case Edge_Cuts: color="#C9C83B"; break;
        case F_Adhes:   color="#A74AA8"; break;
        case F_CrtYd:   color="#A7A7A7"; break;
        case F_Cu:      color="#952927"; break;
        case F_Fab:     color="#C2C200"; break;
        case F_Mask:    color="#943197"; break;
        case F_Paste:   color="#3DC9C9"; break;
        case F_SilkS:   color="#339697"; break;
        case In1_Cu:    color="#C2C200"; break;
        case In2_Cu:    color="#C200C2"; break;
        case In3_Cu:    color="#C20000"; break;
        case In4_Cu:    color="#0000C2"; break;
        case Margin:    color="#D357D2"; break;
        default:        color="#DBDBDB";
    }

    return color;
}

function pad(num, size)
{
    num = num.toString();
    while (num.length < size) {
        num = "0" + num;
    }
    return num;
}

function update_layers_list(commit1, commit2, selected_layer_idx, selected_layer_id)
{
    var used_layers_1;
    var used_layers_2;

    var id;
    var layer;
    var dict = {};

    var id_pad;
    var layer_name;
    var color;
    var checked;

    var new_layers_list = [];
    var form_inputs_html;

    // Get current selected page name
    var layers = $("#layers_list input:radio[name='layers']");
    var selected_layer_element = layers.index(layers.filter(':checked'));

    // Save the current selected page, if any
    try {
        selected_layer = layers[selected_layer_element].id;
    }
    catch(err) {
        selected_layer = "";
        console.log("There isn't a layer selected");
    }

    // File = ../[COMMIT]/_KIRI_/pcb_layers
    // Format = ID|LAYER

    used_layers_1 = loadFile("../" + commit1 + "/_KIRI_/pcb_layers" + url_timestamp(commit1)).split("\n").filter((a) => a);
    used_layers_2 = loadFile("../" + commit2 + "/_KIRI_/pcb_layers" + url_timestamp(commit2)).split("\n").filter((a) => a);

    for (const line of used_layers_1)
    {
        id = line.split("|")[0];
        layer = line.split("|")[1]; //.replace(".", "_");
        dict[id] = [layer];
    }

    for (const line of used_layers_2)
    {
        id = line.split("|")[0];
        layer = line.split("|")[1]; //.replace(".", "_");

        // Add new key
        if (! dict.hasOwnProperty(id)) {
            dict[id] = [layer];
        }
        else {
            // Append if id key exists
            if (dict[id] != layer) {
                dict[id].push(layer);
            }
        }
    }

    console.log("[PCB] Layers =", Object.keys(dict).length);

    for (const [layer_id, layer_names] of Object.entries(dict))
    {
        id = parseInt(layer_id);
        id_pad = pad(id, 2);
        layer_name = layer_names[0];
        color = layer_color(id);

        var input_html = `
        <!-- Generated Layer ${id} -->
        <input  id="layer-${id_pad}" value="layer-${layer_names}" type="radio" name="layers" onchange="update_layer()">
        <label for="layer-${id_pad}" id="label-layer-${id_pad}" data-toggle="tooltip" title="${id}, ${layer_names}" class="rounded text-sm-left list-group-item radio-box" onclick="update_layer_onclick()">
            <span style="margin-left:0.5em; margin-right:0.1em; color:${color}" class="iconify" data-icon="teenyicons-square-solid" data-inline="false"></span>
            ${layer_names}
        </label>
        `;

        new_layers_list.push(layer_names.toString());

        form_inputs_html = form_inputs_html + input_html;
    }

    // Get the current list of pages
    const current_layers_list = Array.from(layers).map((opt) => opt.value.replace("layer-", ""));

        // Return if the current list is equal to the new list
    console.log("current_layers_list = ", current_layers_list);
    console.log("new_layers_list = ", new_layers_list);
    if (current_layers_list.toString() === new_layers_list.toString()) {
        console.log("Keep the same list of layers");
        return;
    }

    // Update layers list
    layers_element = document.getElementById("layers_list_form");
    layers_element.innerHTML = form_inputs_html.replace("undefined", "");

    // Update html tooltips
    $('[data-toggle="tooltip"]').tooltip({html:true});
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({boundary: 'body'});

    // Enable back the selected layer
    const optionLabels = Array.from(layers).map((opt) => opt.id);

    const hasOption = optionLabels.includes(selected_layer);
    if (hasOption) {
        // Keep previews selection active
        $("#layers_list input:radio[name='layers'][value=" + selected_layer + "]").prop('checked', true);
    }
    else {
        // If old selection does not exist, maybe the list is now shorter, then select the last item...
        layers[optionLabels.length-1].checked = true;
    }

    // restore previously selected index
    layers = $("#layers_list input:radio[name='layers']");
    if (selected_layer_idx >= 0) {
        layers[selected_layer_idx].checked = true;
    }

    // If nothing is selected still, select the first item
    if (! layers.filter(':checked').length) {
        layers[0].checked = true;
    }
}

function update_layer() {

    console.log("-----------------------------------------");

    var layers = $("#layers_list input:radio[name='layers']");
    var selected_layer;
    var layer_id;

    if (layers)
    {
        selected_layer = layers.index(layers.filter(':checked'));
        console.log(">>>> [selected_layer] = ", selected_layer);
        if (selected_layer >= 0) {
            layer_id = layers[selected_layer].id.split("-")[1];
            console.log(">>>> [label_id_IF] = ", layer_id);
        }
        else {
            try {
                layers[0].checked = true;
                selected_layer = layers.index(layers.filter(':checked'));
                layer_id = layers[selected_layer].id.split("-")[1];
                console.log(">>>> [label_id_ELSE] = ", layer_id);
            } catch (error) {
                console.log("[PCB] Images may not exist and Kicad layout may be missing.");
                show_sch();
                return;
            }
        }
    }
    else {
        console.log("[PCB] Images may not exist and Kicad layout may be missing.");
        show_sch();
        return;
    }

    if (commit1 == "") {
        commit1 = document.getElementById("diff-xlink-1-pcb").href.baseVal.split("/")[1];
    }
    if (commit2 == "") {
        commit2 = document.getElementById("diff-xlink-2-pcb").href.baseVal.split("/")[1];
    }

    update_layers_list(commit1, commit2, selected_layer, layer_id);

    var image_path_1 = "../" + commit1 + "/_KIRI_/pcb/layer" + "-" + layer_id + ".svg";
    var image_path_2 = "../" + commit2 + "/_KIRI_/pcb/layer" + "-" + layer_id + ".svg";

    console.log("[PCB]      layer_id =", layer_id);
    console.log("[PCB]  image_path_1 =", image_path_1);
    console.log("[PCB]  image_path_2 =", image_path_2);

    var image_path_timestamp_1 = image_path_1 + url_timestamp(commit1);
    var image_path_timestamp_2 = image_path_2 + url_timestamp(commit2);

    if (current_view != old_view)
    {
        old_view = current_view;
        removeEmbed();
        lastEmbed = createNewEmbed(image_path_timestamp_1, image_path_timestamp_2);
    }
    else
    {
        document.getElementById("diff-xlink-1").href.baseVal = image_path_timestamp_1;
        document.getElementById("diff-xlink-2").href.baseVal = image_path_timestamp_2;

        document.getElementById("diff-xlink-1").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_1);
        document.getElementById("diff-xlink-2").setAttributeNS('http://www.w3.org/1999/xlink', 'href', image_path_timestamp_2);

        if_url_exists(image_path_timestamp_1, function(exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-1").parentElement.style.display = 'inline' }
            else {
                document.getElementById("diff-xlink-1").parentElement.style.display = "none";
            }
        });

        if_url_exists(image_path_timestamp_2, function(exists) {
            if (exists == true) {
                document.getElementById("diff-xlink-2").parentElement.style.display = 'inline';
            }
            else {
                document.getElementById("diff-xlink-2").parentElement.style.display = "none";
            }
        });
    }

    // keep images visibility the same as the legend
    $("#diff-xlink-1").css('visibility', $("#commit1_legend").css('visibility'))
    $("#diff-xlink-2").css('visibility', $("#commit2_legend").css('visibility'))

    update_fullscreen_label();
}

// =======================================
// SVG Controls
// =======================================

function select_initial_commits()
{
    var commits = $("#commits_form input:checkbox[name='commit']");

    if (commits.length >= 2)
    {
        commit1 = commits[commits.length - 1].value;
        commit2 = commits[commits.length - 2].value;
        commits[commits.length - 2].checked = true;
        commits[commits.length - 1].checked = true;
    }
    else if (commits.length == 1)
    {
        commit1 = commits[0].value;
        commits[0].checked = true;
    }
}

function get_selected_commits()
{
    var commits = [];
    var hashes = [];
    for (var i = 0; i < commits.length; i++) {
        if ($("#commits_form input:checkbox[name='commit']")[i].checked) {
            var value = $("#commits_form input:checkbox[name='commit']")[i].value;
            hashes.push(value);
        }
    }

    // It needs 2 items selected to do something
    if (hashes.length < 2) {
        return;
    }

    var commit1 = hashes[0].replace(/\s+/g, '');
    var commit2 = hashes[1].replace(/\s+/g, '');

    return [commit1, commit2];
}


// Interpret tooltois as html
$(document).ready(function()
{
    $('[data-toggle="tooltip"]').tooltip({html:true});
    $('[data-toggle="tooltip"]').tooltip('update');
    $('[data-toggle="tooltip"]').tooltip({boundary: 'body'});
});

// Limit commits list with 2 checked commits at most
$(document).ready(function()
{
    $("#commits_form input:checkbox[name='commit']").change(function() {
        var max_allowed = 2;
        var count = $("input[name='commit']:checked").length;
        if (count > max_allowed) {
            $(this).prop("checked", "");
        }
    });
});

function ready()
{
    check_server_status();
    select_initial_commits();

    update_commits();

    if (selected_view == "schematic") {
        show_sch();
        update_page(commit1, commit2);
    }
    else {
        show_pcb();
        update_layer(commit1, commit2);
    }
}

window.onload = function()
{
    console.log("function onload");
};

window.addEventListener('DOMContentLoaded', ready);

// =======================================
// Toggle Schematic/Layout
// =======================================

function show_sch()
{
    // Show schematic stuff
    document.getElementById("show_sch_lbl").classList.add('active');
    document.getElementById("show_sch").checked = true;
    // document.getElementById("diff-sch").style.display = "inline";
    document.getElementById("diff-xlink-1").parentElement.style.display = "inline";
    document.getElementById("diff-xlink-2").parentElement.style.display = "inline";
    document.getElementById("pages_list").style.display = "inline";
    document.getElementById("sch_title").style.display = "inline";

    // Hide layout stuff
    document.getElementById("show_pcb_lbl").classList.remove('active');
    document.getElementById("show_pcb").checked = false;
    // document.getElementById("diff-pcb").style.display = "none";
    // document.getElementById("diff-xlink-1-pcb").parentElement.style.display = "none";
    // document.getElementById("diff-xlink-2-pcb").parentElement.style.display = "none";
    document.getElementById("layers_list").style.display = "none";
    document.getElementById("pcb_title").style.display = "none";

    // Update view_mode
    $('#show_sch').attr('checked', true);
    $('#show_pcb').attr('checked', false);

    update_page(commit1, commit2);
}

function show_pcb()
{
    // Show layout stuff
    document.getElementById("show_pcb_lbl").classList.add('active');
    document.getElementById("show_pcb").checked = true;
    // document.getElementById("diff-pcb").style.display = "inline";
    document.getElementById("diff-xlink-1").parentElement.style.display = "inline";
    document.getElementById("diff-xlink-2").parentElement.style.display = "inline";
    document.getElementById("layers_list").style.display = "inline";
    document.getElementById("pcb_title").style.display = "inline";

    // Hide schematic stuff
    document.getElementById("show_sch_lbl").classList.remove('active');
    document.getElementById("show_sch").checked = false;
    // document.getElementById("diff-sch").style.display = "none";
    // document.getElementById("diff-xlink-1-sch").parentElement.style.display = "none";
    // document.getElementById("diff-xlink-2-sch").parentElement.style.display = "none";
    document.getElementById("pages_list").style.display = "none";
    document.getElementById("sch_title").style.display = "none";

    // Update view_mode
    $('#show_sch').attr('checked', false);
    $('#show_pcb').attr('checked', true);

    update_layer(commit1, commit2);
}

// =======================================
// Toggle Onion/Slide
// =======================================

function show_onion() {
    // console.log("Function:", "show_onion");
}

function show_slide() {
    // console.log("Function:", "show_slide");
}

// =======================================
// =======================================

function update_page_onclick(obj) {
    update_page();
}

function update_layer_onclick(obj) {
    update_layer();
}

// Hide fields with missing images
function imgError(image)
{
    // console.log("Image Error (missing or problematic) =", image.href.baseVal);
    image.onerror = null;
    parent = document.getElementById(image.id).parentElement;
    parent.style.display = "none";
    return true;
}


// #===========================

var server_status = 1;
var old_server_status = -1;

function check_server_status()
{
    var img;

    img = document.getElementById("server_status_img");

    if (! img) {
        img = document.body.appendChild(document.createElement("img"));
        img.setAttribute("id", "server_status_img");
        img.style.display = "none";
    }

    img.onload = function() {
        server_is_online();
    };

    img.onerror = function() {
        server_is_offline();
    };

    img.src = "favicon.ico" + url_timestamp();

    setTimeout(check_server_status, 5000);
}

function server_is_online() {
    server_status = 1;
    document.getElementById("server_offline").style.display = "none";
    if (server_status != old_server_status) {
        old_server_status = server_status;
        console.log("Server is Online");
    }
}

function server_is_offline() {
    server_status = 0;
    document.getElementById("server_offline").style.display = "block";
    if (server_status != old_server_status) {
        old_server_status = server_status;
        console.log("Server is Offline");
    }
}

// ==================================================================

function createNewEmbed(src1, src2)
{
    console.log("createNewEmbed...");

    var embed = document.createElement('div');
    embed.setAttribute('id', "diff-container");
    embed.setAttribute('class', "position-relative");
    embed.setAttribute('style', "padding: 0px; height: 94%;");

    // WORKING WITH FILTERS..
    // https://fecolormatrix.com/

    var svg_element = `
    <svg id="svg-id" style="margin: 0px; width: 100%; height: 100%;"
             xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" >
      <g class="my_svg-pan-zoom_viewport">
          <svg id="img-1">
              <defs>
                  <filter id="filter-1">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="1.0  0.0  0.0  0.0  0.0
                              0.0  1.0  0.0  1.0  0.0
                              0.0  0.0  1.0  1.0  0.0
                              0.0  0.0  0.0  1.0  0.0">
                  </filter>
                  <filter id="filter-12">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="-1.0   0.0   0.0  1.0  1.0
                               0.0  -1.0   0.0  0.0  1.0
                               0.0   0.0  -1.0  0.0  1.0
                               0.0   0.0   0.0  0.6  0.0">
                  </filter>
              </defs>
              <image id="diff-xlink-1" height="100%" width="100%" filter="url(#filter-1)"
                  onerror="this.onerror=null; imgError(this);"
                  href="${src1}" xlink:href="${src1}"/>
          </svg>
          <svg id="img-2">
              <defs>
                  <filter id="filter-2">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="1.0  0.0  0.0  1.0  0.0
                              0.0  1.0  0.0  0.0  0.0
                              0.0  0.0  1.0  0.0  0.0
                              0.0  0.0  0.0  0.5  0.0">
                  </filter>
                  <filter id="filter-22">
                      <feColorMatrix in=SourceGraphic type="matrix"
                      values="-1.0   0.0   0.0  1.0  1.0
                               0.0  -1.0   0.0  0.0  1.0
                               0.0   0.0  -1.0  0.0  1.0
                               0.0   0.0   0.0  0.6  0.0">
                  </filter>
              </defs>
              <image id="diff-xlink-2" height="100%" width="100%" filter="url(#filter-2)"
                  onerror="this.onerror=null; imgError(this);"
                  href="${src2}" xlink:href="${src2}"/>
          </svg>
      </g>
    </svg>
    `;

    document.getElementById('diff-container').replaceWith(embed);
    document.getElementById('diff-container').innerHTML = svg_element;
    console.log(">>> SVG: ", embed);

    svgpanzoom_selector = "#svg-id";


    panZoom_instance = svgPanZoom(
      svgpanzoom_selector, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        center: true,
        minZoom: 1,
        maxZoom: 20,
        zoomScaleSensitivity: 0.22,
        contain: false,
        fit: false, // cannot be used, bug? (this one must be here to change the default)
        viewportSelector: '.my_svg-pan-zoom_viewport',
        eventsListenerElement: document.querySelector(svgpanzoom_selector),
        onUpdatedCTM: function() {
            var zoom_now = panZoom_instance ? panZoom_instance.getZoom() : null;
            if (zoom_now !== null && last_transform_zoom !== null) {
                if (Math.abs(zoom_now - last_transform_zoom) > 0.0001) {
                    suspend_diff_filters_while_zooming();
                }
            }
            last_transform_zoom = zoom_now;

            if (current_view == "show_sch") {
                if (sch_current_zoom != sch_old_zoom) {
                    console.log(">> Restoring SCH pan and zoom");
                    panZoom_instance.zoom(sch_current_zoom);
                    panZoom_instance.pan(sch_current_pan);
                    sch_old_zoom = sch_current_zoom;
                }
            }
            else {
                if (pcb_current_zoom != pcb_old_zoom) {
                    console.log(">> Restoring PCB pan and zoom");
                    panZoom_instance.zoom(pcb_current_zoom);
                    panZoom_instance.pan(pcb_current_pan);
                    pcb_old_zoom = pcb_current_zoom;
                }
            }
        }
    });

    console.log("panZoom_instance:", panZoom_instance);
    last_transform_zoom = panZoom_instance.getZoom();

    embed.addEventListener('load', lastEventListener);

    document.getElementById('zoom-in').addEventListener('click', function(ev) {
        ev.preventDefault();
        suspend_diff_filters_while_zooming();
        panZoom_instance.zoomIn();
    });

    document.getElementById('zoom-out').addEventListener('click', function(ev) {
        ev.preventDefault();
        suspend_diff_filters_while_zooming();
        panZoom_instance.zoomOut();
    });

    document.getElementById('zoom-fit').addEventListener('click', function(ev) {
        ev.preventDefault();
        panZoom_instance.resetZoom();
        panZoom_instance.center();
    });

    apply_diff_filters_for_visibility();

    return embed;
}

function removeEmbed()
{
    console.log(">=============================================<");
    console.log("removeEmbed...");
    console.log(">> lastEmbed: ", lastEmbed);
    console.log(">> panZoom_instance: ", panZoom_instance);

    // Destroy svgpanzoom
    if (panZoom_instance)
    {
        if (current_view == "show_pcb") {
            sch_current_zoom = panZoom_instance.getZoom();
            sch_current_pan = panZoom_instance.getPan();
            sch_old_zoom = null;
        } else {
            pcb_current_zoom = panZoom_instance.getZoom();
            pcb_current_pan = panZoom_instance.getPan();
            pcb_old_zoom = null;
        }

        panZoom_instance.destroy();

        // Remove event listener
        lastEmbed.removeEventListener('load', lastEventListener);

        // Null last event listener
        lastEventListener = null;

        // Remove embed element
        // document.getElementById('diff-container').removeChild(lastEmbed);

        // Null reference to embed
        lastEmbed = null;
    }
}

function update_fullscreen_label()
{
    fullscreen_label = document.getElementById("fullscreen_label");

    commit1 = document.getElementById("commit1_hash").value;
    commit2 = document.getElementById("commit2_hash").value;

    if (current_view == "show_sch")
    {
        pages = $("#pages_list input:radio[name='pages']");
        selected_page = pages.index(pages.filter(':checked'));
        page_name = document.getElementById("label-" + pages[selected_page].id).innerHTML;
        view_item = "Page " + page_name;
    }
    else
    {
        layers = $("#layers_list input:radio[name='layers']");
        selected_layer = layers.index(layers.filter(':checked'));
        layer_name = document.getElementById("label-" + layers[selected_layer].id).innerHTML;
        view_item = "Layer " + layer_name;
    }

    if (is_fullscreen)
    {
        if (fullscreen_label)
        {
            document.getElementById("commit1_fs").innerHTML = `(<a id="commit1_legend_hash">${commit1}</a>)`;
            document.getElementById("commit2_fs").innerHTML = `(<a id="commit2_legend_hash">${commit2}</a>)`;
            document.getElementById("view_item_fs").innerHTML = view_item;
        }
        else
        {
            label = `
                <div id="fullscreen_label" class="alert alert-dark border border-dark rounded-pill position-absolute top-10 start-50 translate-middle" style="background-color: #333;" role="alert">
                    <span id=commit1_legend_fs style="margin-left:0em; margin-right:0.2em; color: #00FFFF; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small id=commit1_legend_text_fs class="text-sm text-light">
                        Newest
                        <span id="commit1_fs" class="text-monospace">(<a id="commit1_legend_hash">${commit1}</a>)</span>
                    </small>

                    <span style="display: inline; width: 3em;"></span>
                    <span id="commit2_legend_fs" style="display: inline; margin-left:1em; margin-right:0.2em; color: #880808; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small id=commit2_legend_text_fs class="text-sm text-light">
                        Oldest
                        <span id="commit2_fs" class="text-monospace">(<a id="commit2_legend_hash">${commit2}</a>)</span>
                    </small>

                    <span style="display: inline; width: 3em;"></span>
                    <span id="commit3_legend_fs" style="margin-left:1em; margin-right:0.2em; color: #807F7F; width: 10px; height: 10px;" class="iconify" data-icon="teenyicons-square-solid"></span>
                    <small id="commit3_legend_text_fs" class="text-sm text-light">
                        Unchanged
                    </small>

                    <small class="text-sm text-muted" style="margin-left:1em; margin-right:0.2em;">
                        |
                    </small>
                    <span style="display: inline; width: 3em;"></span>
                    <small id="view_item_fs" class="text-sm text-light" style="margin-left:1em; margin-right:0.2em;">
                        ${view_item}
                    </small>
                </div>
            `

            const element = $('#diff-container').get(0);
            element.insertAdjacentHTML("afterbegin", label);

            var visibility1 = $("#diff-xlink-1").css('visibility');
            $("#commit1_legend_fs").css('visibility', visibility1)
            $("#commit1_legend_text_fs").css('visibility', visibility1)

            var visibility2 = $("#diff-xlink-2").css('visibility');
            $("#commit2_legend_fs").css('visibility', visibility2)
            $("#commit2_legend_text_fs").css('visibility', visibility2)
        }
    }
}

function toggle_fullscreen()
{
  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)
  {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }

    is_fullscreen = false;
    const box = document.getElementById('fullscreen_label');
    box.remove();

  } else {
    element = $('#diff-container').get(0);
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }

    is_fullscreen = true;
    update_fullscreen_label()
  }
}

function show_info_popup()
{
    document.getElementById("info-btn").click();
}

// Remove focus whne info buttons is clicked with shortcut i
$('#shortcuts-modal').on('shown.bs.modal', function(e){
    $('#info-btn').one('focus', function(e){$(this).blur();});
});

function change_page()
{
    update_page();
}
