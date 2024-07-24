## Hey there!

![How you doin?](https://i.giphy.com/11SIBu3s72Co8w.gif)

### Want some neat Git aliases?

My favorite is `git l`. Oh, and `git al` is the mother of all aliases.

```conf
[alias]
	alias   = config --get-regexp alias
	al      = alias
	a       = add
	aa      = add --all
	b       = branch
	bd      = branch --delete
	bdf     = branch --force --delete
	bf      = branch --force
	bm      = branch --move
	br      = branch --remote
	bt      = branch --track
	c       = commit
	ca      = commit --amend
	cax     = commit --amend --no-edit
	cb      = checkout -b
	cdate   = !echo cmd /v /c \\\"set GIT_COMMITTER_DATE=\\&\\& git ca\\\" && git log -n 1 --format=%aD
	ce      = config --global --edit
	cf      = config
	co      = checkout
	cp      = cherry-pick
	cpn     = cherry-pick --no-commit
	cpc     = cherry-pick --continue
	d       = diff
	ds      = diff --staged
	dt      = difftool --no-prompt --dir-diff --no-symlinks
	f       = fetch --prune
	fp      = format-patch
	ignored = !echo "------- IGNORED: -------" && git ls-files -v | grep -E "^S\\|^[[:lower:]]" || echo "No ignored files."
	ign     = ignored
	ll      = log --all --graph --pretty=format:'%C(auto)%<(90,trunc)%s %h%d'
	l       = ll -20
	lm      = !git --no-pager log --all --pretty=format:'%ad %h %C(auto)%<(107,trunc)%s' --author=Arundas.Thulasidas --reverse --date=iso8601-local
	lr      = log --pretty=format:'%C(auto)%s%d' --reverse
	m       = merge
	man     = help
	mf      = merge --ff-only
	mn      = merge --no-ff
	p       = push
	pb      = push --set-upstream origin
	pd      = push origin --delete
	pl      = pull --ff-only
	pr      = !git push origin HEAD:\"$1\" && echo Pushed without tracking to
	rb      = rebase --interactive
	rbc     = rebase --committer-date-is-author-date
	rh      = reset --hard
	rs      = restore --staged
	rv      = remote -v
	s       = !git status --short && git ignored
	st      = !git status && echo "" && git ignored
	sw      = switch
	t       = log --oneline --decorate --tags --no-walk
	uia     = update-index --assume-unchanged
	uian    = update-index --no-assume-unchanged
	uil     = ignored
	uis     = update-index --skip-worktree
	uisn    = update-index --no-skip-worktree
	w       = worktree
	wa      = worktree add
```

Also, I have aliased `g` to `git`. You can do this in `.zshrc` or `.bashrc`:

```bash
alias g="git"
```

With this, I can simply do `g l` instead of `git l`.

---

I don't have anything else here at the moment. Thanks for reading!
