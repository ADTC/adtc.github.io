## Hey there!

![How you doin?](https://i.giphy.com/11SIBu3s72Co8w.gif)

### Want some neat Git aliases?

My favorite is `git l`. Oh, and `git al` is the mother of all aliases.

```
[alias]
        alias = config --get-regexp alias
        al    = alias
        a     = add
        aa    = add --all
        b     = branch
        bd    = branch --delete
        bdf   = branch --delete --force
        bf    = branch --force
        bm    = branch --move
        c     = commit
        ca    = commit --amend
        cb    = checkout -b
        ce    = config --global --edit
        cf    = config
        co    = checkout
        cp    = cherry-pick
        cpn   = cherry-pick --no-commit
        cpc   = cherry-pick --continue
        d     = diff
        ds    = diff --staged
        f     = fetch --prune
        ignored = !git ls-files -v | grep "^[[:lower:]]"
        l     = log --all --graph --pretty=format:'%C(auto)%<(90,trunc)%s %h%d'
        ll    = l -35
        lr    = log --pretty=format:'%C(auto)%s%d' --reverse
        m     = merge
        man   = help
        mf    = merge --ff-only
        mn    = merge --no-ff
        p     = push
        pb    = push --set-upstream origin
        pd    = push origin --delete
        pl    = pull --ff-only
        rv    = remote -v
        s     = status --short
        st    = status
        t     = log --oneline --decorate --tags --no-walk
        uia   = update-index --assume-unchanged
        uin   = update-index --no-assume-unchanged
```

I don't have anything else here at the moment.

Why don't you head on over to [my blog](https://thehunk.blogspot.com) and read some posts?
