

// [7, 1, 5, 3, 6, 4]
//     l           r

// [7] or []
// if the arrays length is less than 2, return 0, because we can't make a profit 

// maxProfit = 5
// l = 0
// r = 1
// if the right > left, updte maxProfit = max( maxprofit, r-l )
// when we will find something less then l, we will do l = r

function maxProfit(prices){
    if (prices.length < 2){
        return 0
    }
    let maxPrice = 0
    let l = 0
    let r = 1
    while(r < prices.length){
        if(prices[l] < prices[r]){
            maxPrice = Math.max(prices[r] - prices[l], maxPrice)
        }
        if ( prices[r] < prices[l]){
            l = r
        }
        r++
    }

    return maxPrice
}

let p = [7, 1, 5, 3, 6, 4]
let p1 = []
let p2 = [2]
console.log(maxProfit(p))